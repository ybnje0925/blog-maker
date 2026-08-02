import express from "express";
import path from "path";
import multer from "multer";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

const app = express();
const PORT = parseInt(process.env.PORT || "3222", 10);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

function getAIClient(userApiKey?: string) {
  const apiKey = userApiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되어 있지 않습니다. 개인 Gemini API Key를 입력하거나 서버 환경 변수를 확인해 주세요.");
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { "User-Agent": "blogdraft" },
    },
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = 60000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TIMEOUT_ERROR: API 응답 시간이 초과되었습니다.")), timeoutMs);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

const GEMINI_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
].filter(Boolean) as string[];

function isModelFallbackError(error: any) {
  const message = (error?.message || "").toString();
  const status = (error?.status || "").toString();
  return (
    status === "404" ||
    status === "400" ||
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("not supported") ||
    message.includes("not available") ||
    message.includes("INVALID_ARGUMENT")
  );
}

async function generateContentWithModelFallback(
  ai: GoogleGenAI,
  params: Omit<Parameters<GoogleGenAI["models"]["generateContent"]>[0], "model">,
  timeoutMs: number
) {
  let lastError: any = null;

  for (const model of GEMINI_MODEL_CANDIDATES) {
    try {
      return await withTimeout(
        ai.models.generateContent({
          ...params,
          model,
        }),
        timeoutMs
      );
    } catch (error: any) {
      lastError = error;
      if (!isModelFallbackError(error)) break;
      console.warn(`Gemini model fallback: ${model} failed, trying next model.`);
    }
  }

  throw lastError;
}

function getFriendlyApiError(error: any) {
  const errString = (error?.message || "").toString();
  const statusStr = (error?.status || "").toString();

  if (errString.includes("429") || errString.includes("RESOURCE_EXHAUSTED") || errString.includes("Quota exceeded") || errString.includes("Rate Limit")) {
    return {
      status: 429,
      message: "API 호출 한도를 초과했습니다. 잠시 뒤 다시 시도하거나 개인 Gemini API Key를 사용해 주세요.",
    };
  }

  if (errString.includes("GEMINI_API_KEY")) {
    return {
      status: 400,
      message: "Gemini API Key가 서버에 설정되어 있지 않습니다. 개인 Gemini API Key를 입력한 뒤 다시 시도해 주세요.",
    };
  }

  if (errString.includes("API key not valid") || errString.includes("API_KEY_INVALID") || errString.includes("PERMISSION_DENIED") || statusStr === "401" || statusStr === "403") {
    return {
      status: 400,
      message: "Gemini API Key가 올바르지 않거나 해당 모델 사용 권한이 없습니다. AI Studio에서 새 API Key를 발급해 다시 입력해 주세요.",
    };
  }

  if (errString.includes("TIMEOUT_ERROR")) {
    return {
      status: 504,
      message: "Gemini API 응답 시간이 초과되었습니다. 이미지 수를 줄이거나 PDF 용량을 낮춰 다시 시도해 주세요.",
    };
  }

  if (isModelFallbackError(error)) {
    return {
      status: 400,
      message: "현재 API Key에서 사용할 수 있는 Gemini 모델을 찾지 못했습니다. 서버의 GEMINI_MODEL 설정 또는 API Key 권한을 확인해 주세요.",
    };
  }

  return {
    status: 500,
    message: `서버 처리 중 오류가 발생했습니다. 세부 오류: ${errString.slice(0, 220) || "알 수 없는 오류"}`,
  };
}

const SYSTEM_PROMPT_A = `
당신은 BlogDraft의 블로그 초안 편집 도우미입니다.

핵심 원칙:
- AI가 블로그를 대신 완성하거나 발행한다고 말하지 않습니다.
- 사용자가 자신의 경험, 사실 확인, 말투 수정을 더하기 쉬운 "수정 가능한 초안"을 작성합니다.
- "클릭 한 번으로 완성", "검색 노출 보장", "저품질 회피 보장" 같은 과장 표현은 절대 쓰지 않습니다.
- 장소, 가격, 운영시간, 제품 사양처럼 변할 수 있는 정보는 단정하지 말고 사용자가 확인하도록 자연스럽게 남깁니다.
- 참고 PDF가 있으면 문장 호흡, 말투, 단락 구성, 소제목 형식, 이모지 사용 방식만 참고합니다. 기존 문장을 그대로 복사하지 않습니다.
- 참고 PDF나 사용자 요청에서 이모지 사용이 보이면 새 초안에도 비슷한 빈도와 위치로 자연스럽게 반영합니다. 이모지가 전혀 없는 스타일이면 과하게 넣지 않습니다.
- 이모지는 문단마다 억지로 붙이지 말고, 소제목이나 짧은 감상 문장에 3~8개 정도 자연스럽게 섞습니다.
- 사진이 있으면 글의 흐름에 맞게 사진 배치 태그를 포함합니다.

사진 태그 규칙:
- 단일 사진: [사진 1]
- 여러 사진 비교나 디테일: [사진그리드: 1,2,3]
- 과정이나 순서가 중요한 사진: [사진슬라이드: 1,2,3]
- 업로드된 사진은 가능한 한 모두 한 번 이상 자연스럽게 배치합니다.

출력 형식:
- 마크다운으로 작성합니다.
- 제목, 도입, 본문 소제목, 사진 배치 태그, 마무리, "발행 전 내가 더하면 좋은 내용" 섹션을 포함합니다.
- 참고 PDF에 이모지가 있었다면 소제목이나 짧은 강조 문장에 비슷한 방식으로 이모지를 일부 반영합니다.
- 마지막 섹션에는 실제 경험, 가격/위치/운영시간 확인, 내 말투로 수정할 문장 점검을 안내합니다.
`.trim();

const SYSTEM_PROMPT_B = `
당신은 BlogDraft의 썸네일 문구 제안 도우미입니다.

핵심 원칙:
- 일률적인 AI 썸네일처럼 보이는 과장 문구를 피합니다.
- 사용자가 직접 만든 것처럼 자연스럽게 수정하기 쉬운 짧은 문구를 제안합니다.
- 글 내용과 맞지 않는 낚시성 표현, 검색 노출 보장 표현, 과장된 수치 표현은 쓰지 않습니다.
- 대표 사진과 블로그 글의 분위기에 어울리는 메인 문구, 서브 문구, 배치 위치를 제안합니다.

JSON으로만 응답하세요.
`.trim();

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "BlogDraft backend is running" });
});

const uploadMiddleware = upload.fields([
  { name: "photos", maxCount: 20 },
  { name: "pdf", maxCount: 1 },
  { name: "referenceThumbnail", maxCount: 1 },
]);

const recommendThumbnailUpload = upload.fields([
  { name: "photo", maxCount: 1 },
  { name: "referenceThumbnail", maxCount: 1 },
]);

async function generateThumbnailData(args: {
  ai: GoogleGenAI;
  selectedPhoto?: Express.Multer.File | null;
  referenceThumbnail?: Express.Multer.File | null;
  blogContent: string;
  userRequest: string;
}) {
  const partsB: any[] = [];

  if (args.selectedPhoto) {
    partsB.push({
      inlineData: {
        mimeType: args.selectedPhoto.mimetype || "image/jpeg",
        data: args.selectedPhoto.buffer.toString("base64"),
      },
    });
    partsB.push({ text: "[대표 사진] 썸네일 배경으로 선택된 이미지입니다." });
  }

  if (args.referenceThumbnail) {
    partsB.push({
      inlineData: {
        mimeType: args.referenceThumbnail.mimetype || "image/jpeg",
        data: args.referenceThumbnail.buffer.toString("base64"),
      },
    });
    partsB.push({
      text: "[참고 썸네일] 이 이미지는 매우 중요한 스타일 참고자료입니다. 글자 위치, 정렬 방향, 문구 줄 수, 문구 길이, 여백 크기, 배경 어둡게 처리 여부, 텍스트 박스/그림자 느낌, 전체 분위기를 분석해 가능한 한 비슷한 구성으로 제안하세요. 단, 특정 이미지나 디자인을 그대로 복제하지 말고 구성과 분위기만 참고하세요.",
    });
  }

  partsB.push({
    text: `
블로그 초안 일부:
${args.blogContent.slice(0, 1600)}

사용자 요청사항:
${args.userRequest || "없음"}

아래 스키마에 맞춰 자연스럽고 수정하기 쉬운 썸네일 문구를 제안하세요.
참고 썸네일이 있으면 문구 길이와 배치 위치를 그 참고 이미지에 최대한 가깝게 맞추세요.
layout_position은 참고 썸네일의 텍스트 위치와 가장 가까운 값을 고르세요.
`.trim(),
  });

  const fallback = {
    thumbnail_main_text: "내가 완성하는 기록",
    thumbnail_sub_text: "초안에 경험을 더해 정리",
    layout_position: "CENTER",
  };

  try {
    const thumbResponse = await generateContentWithModelFallback(
      args.ai,
      {
        contents: { parts: partsB },
        config: {
          systemInstruction: SYSTEM_PROMPT_B,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              thumbnail_main_text: { type: Type.STRING, description: "15자 안팎의 메인 문구" },
              thumbnail_sub_text: { type: Type.STRING, description: "20자 안팎의 서브 문구" },
              layout_position: { type: Type.STRING, description: "CENTER, BOTTOM_LEFT, TOP_BANNER 중 하나" },
            },
            required: ["thumbnail_main_text", "thumbnail_sub_text", "layout_position"],
          },
        },
      },
      30000
    );

    if (!thumbResponse.text) return fallback;
    const parsed = JSON.parse(thumbResponse.text.trim());
    return {
      thumbnail_main_text: parsed.thumbnail_main_text || fallback.thumbnail_main_text,
      thumbnail_sub_text: parsed.thumbnail_sub_text || fallback.thumbnail_sub_text,
      layout_position: ["CENTER", "BOTTOM_LEFT", "TOP_BANNER"].includes(parsed.layout_position) ? parsed.layout_position : "CENTER",
    };
  } catch (error) {
    console.error("Thumbnail generation warning:", error);
    return fallback;
  }
}

async function generatePdfBriefing(ai: GoogleGenAI, pdfFile: Express.Multer.File | null) {
  if (!pdfFile) return "";

  try {
    const response = await generateContentWithModelFallback(
      ai,
      {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: pdfFile.buffer.toString("base64"),
              },
            },
            {
              text: `
첨부된 PDF를 BlogDraft 참고자료 관점에서 4줄 이내로 브리핑하세요.
- 문장 호흡과 말투
- 단락/소제목 구성
- 이모지나 특수문자 사용 방식
- 새 초안에 참고할 점
기존 문장을 그대로 인용하거나 복사하지 말고, 스타일 분석만 요약하세요.
`.trim(),
            },
          ],
        },
        config: {
          systemInstruction: "당신은 블로그 글 스타일을 간단히 분석해 사용자에게 설명하는 편집 도우미입니다.",
          temperature: 0.2,
        },
      },
      30000
    );

    return response.text?.trim() || "";
  } catch (error) {
    console.error("PDF briefing warning:", error);
    return "PDF 참고자료를 첨부했습니다. 문장 호흡, 말투, 단락 구성과 표현 방식은 초안 생성에 참고됩니다.";
  }
}

app.post("/api/generate", (req, res) => {
  uploadMiddleware(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr instanceof multer.MulterError && uploadErr.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          error: "업로드한 사진 또는 PDF 용량이 너무 큽니다. 파일 수나 용량을 줄인 뒤 다시 시도해 주세요.",
        });
      }

      return res.status(400).json({
        success: false,
        error: `파일 업로드 처리 중 오류가 발생했습니다: ${uploadErr.message}`,
      });
    }

    try {
      const userApiKey = req.body.userApiKey as string | undefined;
      const ai = getAIClient(userApiKey);

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const photos = files?.photos || [];
      const pdfFile = files?.pdf?.[0] || null;
      const referenceThumbnail = files?.referenceThumbnail?.[0] || null;
      const tone = (req.body.tone as string) || "친근한 존댓말";
      const styleLevel = (req.body.styleLevel as string) || "3";
      const userRequest = (req.body.userRequest as string) || "";
      const thumbnailIndex = parseInt((req.body.thumbnailIndex as string) || "0", 10);

      const partsA: any[] = [];

      if (pdfFile) {
        partsA.push({
          inlineData: {
            mimeType: "application/pdf",
            data: pdfFile.buffer.toString("base64"),
          },
        });
        partsA.push({
          text: `[내 글 스타일 참고자료] ${pdfFile.originalname} 파일이 첨부되었습니다. 기존 문장을 복사하지 말고 문장 호흡, 말투, 단락 구성, 소제목 방식만 참고하세요.`,
        });
      } else {
        partsA.push({
          text: "[내 글 스타일 참고자료] 첨부된 PDF가 없습니다. 선택한 기본 말투와 사용자 요청사항을 기준으로 초안을 작성하세요.",
        });
      }

      if (photos.length > 0) {
        photos.forEach((photo, idx) => {
          partsA.push({
            inlineData: {
              mimeType: photo.mimetype || "image/jpeg",
              data: photo.buffer.toString("base64"),
            },
          });
          partsA.push({ text: `[사진 ${idx + 1}] ${photo.originalname || `사진 ${idx + 1}`}` });
        });
      } else {
        partsA.push({ text: "[사진] 업로드된 사진이 없습니다. 사진 배치 태그 없이 글 초안만 작성하세요." });
      }

      partsA.push({
        text: `
입력 조건:
- 업로드 사진 수: ${photos.length}
- 기본 말투: ${tone}
- 표현 강도: ${styleLevel}/5
- 사용자 추가 요청사항: ${userRequest || "없음"}

목표:
사진과 기존 글을 바탕으로 내 말투에 가까운 블로그 초안을 만들고, 사용자가 경험과 사실 확인을 더해 완성할 수 있게 작성하세요.
`.trim(),
      });

      const blogResponse = await generateContentWithModelFallback(
        ai,
        {
          contents: { parts: partsA },
          config: {
            systemInstruction: SYSTEM_PROMPT_A,
            temperature: 0.7,
          },
        },
        60000
      );

      const blogContent = blogResponse.text || "# 블로그 초안\n\n초안을 생성하지 못했습니다. 입력 자료를 줄여 다시 시도해 주세요.";
      const pdfBriefing = await generatePdfBriefing(ai, pdfFile);

      const selectedPhoto = photos[thumbnailIndex] || photos[0] || null;
      const thumbnailData = await generateThumbnailData({
        ai,
        selectedPhoto,
        referenceThumbnail,
        blogContent,
        userRequest,
      });

      return res.json({
        success: true,
        blogContent,
        thumbnailData,
        pdfBriefing,
        selectedThumbnailIndex: thumbnailIndex,
      });
    } catch (error: any) {
      console.error("Error generating content:", error?.message || error);

      const friendly = getFriendlyApiError(error);
      return res.status(friendly.status).json({
        success: false,
        error: friendly.message,
      });
    }
  });
});

app.post("/api/recommend-thumbnail", (req, res) => {
  recommendThumbnailUpload(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({
        success: false,
        error: `파일 업로드 처리 중 오류가 발생했습니다: ${uploadErr.message}`,
      });
    }

    try {
      const userApiKey = req.body.userApiKey as string | undefined;
      const ai = getAIClient(userApiKey);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const selectedPhoto = files?.photo?.[0] || null;
      const referenceThumbnail = files?.referenceThumbnail?.[0] || null;
      const blogContent = (req.body.blogContent as string) || "";
      const userRequest = (req.body.userRequest as string) || "";

      const thumbnailData = await generateThumbnailData({
        ai,
        selectedPhoto,
        referenceThumbnail,
        blogContent,
        userRequest,
      });

      return res.json({ success: true, thumbnailData });
    } catch (error: any) {
      console.error("Error recommending thumbnail:", error?.message || error);
      const friendly = getFriendlyApiError(error);
      return res.status(friendly.status).json({
        success: false,
        error: friendly.message,
      });
    }
  });
});

app.use("/api", (_req, res) => {
  res.status(404).json({ success: false, error: "요청한 API 경로를 찾을 수 없습니다." });
});

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled server error:", err?.message || err);
  if (req.path.startsWith("/api") && !res.headersSent) {
    return res.status(500).json({
      success: false,
      error: "서버에서 예기치 않은 오류가 발생했습니다.",
    });
  }
  res.status(500).send("Internal Server Error");
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
