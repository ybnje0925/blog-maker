import express from "express";
import path from "path";
import multer from "multer";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB per file
});

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Helper to get GoogleGenAI instance safely without exposing or logging user keys
function getAIClient(userApiKey?: string) {
  const apiKey = (userApiKey && userApiKey.trim().length > 0)
    ? userApiKey.trim()
    : process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다. 개인 API Key를 입력하거나 AI Studio 환경변수를 확인해 주세요.");
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Timeout helper to avoid server hang
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 60000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("TIMEOUT_ERROR: API 응답 시간이 60초를 초과하였습니다."));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// System Prompts as specified
const SYSTEM_PROMPT_A = `
[역할 정의]
당신은 베테랑 블로그 에디터이자 콘텐츠 분석가입니다. 
제공된 [사진 데이터], [레퍼런스 PDF 문서], [사용자 추가 요청사항]을 종합적으로 분석하여 완벽하게 발행 가능한 형태의 블로그 포스트를 작성하세요.

[입력 데이터]
1. [사진 데이터]: 업로드된 본문용 이미지 목록 및 순서
2. [레퍼런스 PDF]: 스타일 복제용 기존 블로그 글 PDF 문서
3. [기본 말투 설정]: 기본 톤앤매너
4. [스타일 수준 (Level 1~5)]: 1단계(건조한 사실 중심) ~ 5단계(감성/스토리텔링 극대화)
5. [사용자 추가 요청사항]: 최우선 지시사항

[최우선 적용 처리 규칙]
★ [사용자 추가 요청사항]의 지시사항은 말투 설정, 레퍼런스 PDF 분석 결과, 스타일 수준보다 '최우선(Overriding)'하여 반영해야 합니다.
★ [레퍼런스 PDF]가 제공된 경우, 해당 문서의 문장 호흡, 단락 구분, 소제목 형태(질문형/요약형 등), 특수문자 및 이모지 사용 패턴, 캡션 작성 톤을 분석하여 새 글에 동일하게 복제하세요.

[사진 배치 태그 규칙]
업로드된 사진들의 실제 내용(구도, 피사체, 순서상 맥락)을 분석하여 아래 3가지 태그 중 글의 흐름에 가장 어울리는 형태를 선택해 배치하세요. 사진 번호는 업로드 순서를 그대로 따르지 말고, 글의 서사(도입-과정-결과 등) 흐름에 맞게 자유롭게 재배열하세요.
1. 단일 강조 사진 (임팩트 있는 대표 컷 1장): [사진 3]
2. 그리드 배치 (비교/나열/디테일 컷 2~4장을 한 번에 보여줄 때): [사진그리드: 1,2,4]
3. 슬라이드 배치 (과정/순서/여러 장의 흐름을 이어서 보여줄 때): [사진슬라이드: 5,6,7,8]
- 사진이 2장 이상 밀집된 맥락(예: 시공 전/중/후, 여러 각도 비교, 단계별 과정)에서는 단일 태그를 반복하지 말고 반드시 그리드 또는 슬라이드 태그를 사용하세요.
- 모든 업로드 사진은 최소 1회 이상 태그에 포함되어야 합니다.

[출력 요구사항]
1. 마크다운(Markdown) 포맷으로 제목부터 서론, 소제목(###), 본문, 결론까지 완벽히 완결된 글 형태로 출력하세요.
2. 위 [사진 배치 태그 규칙]에 따라 사진을 글의 흐름상 가장 어울리는 위치에 배치하세요.
`.trim();

const SYSTEM_PROMPT_B = `
[역할 정의]
당신은 클릭률을 극대화하는 블로그 썸네일 디자이너이자 카피라이터입니다.
선택된 썸네일 사진과 블로그 내용, 사용자의 [썸네일 추가 요청사항]을 바탕으로 최적의 타이틀 카피를 생성하세요.

[출력 요구사항]
1. 사진 중앙이나 상/하단에 합성할 짧고 강렬한 '메인 카피' (15자 이내)
2. 부연 설명을 제공하는 '서브 카피' (20자 이내)
3. 오직 아래 지정된 JSON 포맷으로만 응답하세요.

[출력 포맷 (JSON)]
{
  "thumbnail_main_text": "메인 카피 문구",
  "thumbnail_sub_text": "서브 카피 문구",
  "layout_position": "CENTER | BOTTOM_LEFT | TOP_BANNER"
}
`.trim();

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "AI Blog Generator backend is running" });
});

// Multer upload middleware with custom error handling
const uploadMiddleware = upload.fields([
  { name: "photos", maxCount: 20 },
  { name: "pdf", maxCount: 1 },
]);

// API Route: Generate Blog Post & Thumbnail Copy
app.post("/api/generate", (req, res) => {
  uploadMiddleware(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr instanceof multer.MulterError && uploadErr.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          error: "업로드한 사진 및 PDF의 용량이 너무 큽니다. 사진 수를 줄이거나 PDF 용량을 확인해 주세요.",
        });
      }
      return res.status(400).json({
        success: false,
        error: "파일 업로드 처리 중 오류가 발생했습니다: " + uploadErr.message,
      });
    }

    try {
      const userApiKey = req.body.userApiKey as string | undefined;
      // Note: Never console.log userApiKey for safety!
      const ai = getAIClient(userApiKey);

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const photos = files?.["photos"] || [];
      const pdfFiles = files?.["pdf"] || [];
      const pdfFile = pdfFiles.length > 0 ? pdfFiles[0] : null;

      const tone = (req.body.tone as string) || "친근한 해요체";
      const styleLevel = (req.body.styleLevel as string) || "3";
      const userRequest = (req.body.userRequest as string) || "";
      const thumbnailIndex = parseInt((req.body.thumbnailIndex as string) || "0", 10);

      // Prepare parts for Prompt A
      const partsA: any[] = [];

      // 1. Add PDF Part if present
      if (pdfFile) {
        partsA.push({
          inlineData: {
            mimeType: "application/pdf",
            data: pdfFile.buffer.toString("base64"),
          },
        });
        partsA.push({
          text: `[레퍼런스 PDF]: 참고할 기존 블로그 글 문서 (${pdfFile.originalname})가 첨부되었습니다. 이 문서의 어조, 단락 구조, 소제목 스타일, 이모지 활용법을 철저히 분석하여 복제해 주세요.`,
        });
      } else {
        partsA.push({
          text: "[레퍼런스 PDF]: 첨부된 레퍼런스 PDF 파일이 없습니다. 기본 말투 및 입력 조건에 맞추어 작성해 주세요.",
        });
      }

      // 2. Add Photos Parts
      if (photos.length > 0) {
        photos.forEach((photo, idx) => {
          partsA.push({
            inlineData: {
              mimeType: photo.mimetype || "image/jpeg",
              data: photo.buffer.toString("base64"),
            },
          });
          partsA.push({
            text: `[사진 ${idx + 1}]: 이미지 (${photo.originalname || `사진 ${idx + 1}`})`,
          });
        });
      } else {
        partsA.push({
          text: "[사진 데이터]: 업로드된 사진이 없습니다.",
        });
      }

      // 3. Add User parameters prompt
      const promptText = `
[입력 매개변수 정보]
- 총 업로드 사진 개수: ${photos.length}장 (본문 내 [사진 배치 태그 규칙]에 따라 단일/그리드/슬라이드 태그로 배치 필요, 모든 사진이 최소 1회 이상 등장해야 함)
- 기본 말투 설정: ${tone}
- 스타일 수준 (Level 1~5): ${styleLevel}단계 (1: 사실 중심 ~ 5: 감성/스토리텔링)
- 사용자 추가 요청사항 (최우선 적용): ${userRequest || "특별한 추가 요구사항 없음"}

위 지침과 첨부된 자료들을 종합하여 가독성이 뛰어난 네이버/티스토리 스타일의 고품질 마크다운 블로그 포스트를 완성하세요.
`.trim();

      partsA.push({ text: promptText });

      // Call Gemini with 60s timeout for Blog Content Generation
      const blogResponse = await withTimeout(
        ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: { parts: partsA },
          config: {
            systemInstruction: SYSTEM_PROMPT_A,
            temperature: 0.7,
          },
        }),
        60000
      );

      const blogContent = blogResponse.text || "# 블로그 포스트 생성 실패\n\n내용을 생성하지 못했습니다.";

      // Step 2: Thumbnail Copy Generation
      const partsB: any[] = [];
      const selectedPhoto = photos[thumbnailIndex] || (photos.length > 0 ? photos[0] : null);

      if (selectedPhoto) {
        partsB.push({
          inlineData: {
            mimeType: selectedPhoto.mimetype || "image/jpeg",
            data: selectedPhoto.buffer.toString("base64"),
          },
        });
        partsB.push({
          text: `[선택된 썸네일 이미지]: 썸네일 배경으로 지정된 이미지입니다.`,
        });
      }

      partsB.push({
        text: `
[블로그 본문 요약 / 참고 내용]
${blogContent.slice(0, 1500)}

[사용자 추가 요청사항]: ${userRequest || "없음"}

위 이미지 및 블로그 포스트 주제에 가장 잘 어울리며 시선을 사로잡는 강렬한 썸네일 타이틀 카피 (메인 카피, 서브 카피) 및 배치 위치(layout_position)를 생성해 주세요.
`.trim(),
      });

      let thumbnailData = {
        thumbnail_main_text: "AI 자동 생성 블로그",
        thumbnail_sub_text: "한 번의 클릭으로 완성하는 콘텐츠",
        layout_position: "CENTER",
      };

      try {
        const thumbResponse = await withTimeout(
          ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: { parts: partsB },
            config: {
              systemInstruction: SYSTEM_PROMPT_B,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  thumbnail_main_text: {
                    type: Type.STRING,
                    description: "메인 카피 문구 (15자 이내)",
                  },
                  thumbnail_sub_text: {
                    type: Type.STRING,
                    description: "서브 카피 문구 (20자 이내)",
                  },
                  layout_position: {
                    type: Type.STRING,
                    description: "CENTER | BOTTOM_LEFT | TOP_BANNER 중 하나",
                  },
                },
                required: ["thumbnail_main_text", "thumbnail_sub_text", "layout_position"],
              },
            },
          }),
          30000
        );

        if (thumbResponse.text) {
          const parsed = JSON.parse(thumbResponse.text.trim());
          thumbnailData = {
            thumbnail_main_text: parsed.thumbnail_main_text || "오늘의 리뷰",
            thumbnail_sub_text: parsed.thumbnail_sub_text || "솔직 후기와 꿀팁 정리",
            layout_position: parsed.layout_position || "CENTER",
          };
        }
      } catch (err) {
        console.error("Thumbnail JSON generation warning:", err);
      }

      return res.json({
        success: true,
        blogContent,
        thumbnailData,
        selectedThumbnailIndex: thumbnailIndex,
      });
    } catch (error: any) {
      console.error("Error generating content:", error?.message || error);

      const errString = (error?.message || "").toString();
      const statusStr = (error?.status || "").toString();

      if (
        errString.includes("429") ||
        errString.includes("RESOURCE_EXHAUSTED") ||
        errString.includes("Quota exceeded") ||
        errString.includes("Rate Limit")
      ) {
        return res.status(429).json({
          success: false,
          error: "API 호출 한도(Rate Limit)를 초과했습니다. 잠시 후 다시 시도하시거나 본인의 개인 API Key를 사용해 주세요.",
        });
      }

      if (
        errString.includes("API key not valid") ||
        errString.includes("400") ||
        errString.includes("INVALID_ARGUMENT") ||
        statusStr === "400"
      ) {
        return res.status(400).json({
          success: false,
          error: "올바르지 않은 API Key이거나 이미지/PDF 파일 포맷 오류입니다.",
        });
      }

      if (errString.includes("TIMEOUT_ERROR")) {
        return res.status(504).json({
          success: false,
          error: "Gemini API 응답 시간이 60초를 초과하였습니다. 이미지 수나 요청 용량을 조정해 주세요.",
        });
      }

      return res.status(500).json({
        success: false,
        error: "서버 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      });
    }
  });
});

// Any unmatched /api/* request should return JSON, never fall through to the SPA HTML shell
app.use("/api", (_req, res) => {
  res.status(404).json({ success: false, error: "요청한 API 경로를 찾을 수 없습니다." });
});

// Global error handler: guarantees /api/* callers always get JSON, never an HTML error page
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled server error:", err?.message || err);
  if (req.path.startsWith("/api") && !res.headersSent) {
    return res.status(500).json({
      success: false,
      error: "서버에서 예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    });
  }
  res.status(500).send("Internal Server Error");
});

// Start server with Vite middleware support
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
