import multer from "multer";
import { promisify } from "util";
import { GoogleGenAI, Type } from "@google/genai";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 22 },
});

const GEMINI_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
].filter(Boolean) as string[];

export function runMiddleware(req: any, res: any, middleware: any) {
  return promisify(middleware)(req, res);
}

export function getAIClient(userApiKey?: string) {
  const apiKey = userApiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되어 있지 않습니다. 개인 Gemini API Key를 입력해 주세요.");
  }
  return new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "blogdraft-vercel" } } });
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

export async function generateContentWithModelFallback(
  ai: GoogleGenAI,
  params: Omit<Parameters<GoogleGenAI["models"]["generateContent"]>[0], "model">,
  timeoutMs: number
) {
  let lastError: any = null;
  for (const model of GEMINI_MODEL_CANDIDATES) {
    try {
      return await withTimeout(ai.models.generateContent({ ...params, model }), timeoutMs);
    } catch (error: any) {
      lastError = error;
      if (!isModelFallbackError(error)) break;
    }
  }
  throw lastError;
}

export function getFriendlyApiError(error: any) {
  const errString = (error?.message || "").toString();
  const statusStr = (error?.status || "").toString();

  if (errString.includes("429") || errString.includes("RESOURCE_EXHAUSTED") || errString.includes("Quota exceeded") || errString.includes("Rate Limit")) {
    return { status: 429, message: "API 호출 한도를 초과했습니다. 잠시 뒤 다시 시도하거나 개인 Gemini API Key를 사용해 주세요." };
  }
  if (errString.includes("File too large") || errString.includes("LIMIT_FILE_SIZE") || errString.includes("Payload Too Large")) {
    return { status: 413, message: "업로드 파일이 너무 큽니다. Vercel 배포 환경에서는 이미지를 압축하고 PDF는 1.6MB 이하로 올려 주세요." };
  }
  if (errString.includes("GEMINI_API_KEY")) {
    return { status: 400, message: "Gemini API Key가 설정되어 있지 않습니다. 개인 Gemini API Key를 입력한 뒤 다시 시도해 주세요." };
  }
  if (errString.includes("API key not valid") || errString.includes("API_KEY_INVALID") || errString.includes("PERMISSION_DENIED") || statusStr === "401" || statusStr === "403") {
    return { status: 400, message: "Gemini API Key가 올바르지 않거나 해당 모델 사용 권한이 없습니다. AI Studio에서 새 API Key를 발급해 다시 입력해 주세요." };
  }
  if (errString.includes("TIMEOUT_ERROR")) {
    return { status: 504, message: "Gemini API 응답 시간이 초과되었습니다. 이미지 수를 줄이거나 PDF 용량을 낮춰 다시 시도해 주세요." };
  }
  if (isModelFallbackError(error)) {
    return { status: 400, message: "현재 API Key에서 사용할 수 있는 Gemini 모델을 찾지 못했습니다. GEMINI_MODEL 설정 또는 API Key 권한을 확인해 주세요." };
  }
  if (errString.includes("fetch failed") || errString.includes("EACCES") || errString.includes("ENOTFOUND")) {
    return { status: 502, message: "Vercel 함수가 Gemini API에 연결하지 못했습니다. 잠시 뒤 다시 시도하거나 Vercel 네트워크/환경변수 설정을 확인해 주세요." };
  }
  return { status: 500, message: `서버 처리 중 오류가 발생했습니다. 세부 오류: ${errString.slice(0, 220) || "알 수 없는 오류"}` };
}

export const SYSTEM_PROMPT_A = `
당신은 BlogDraft의 블로그 초안 편집 도우미입니다.

핵심 원칙:
- AI가 블로그를 대신 완성하거나 발행한다고 말하지 않습니다.
- 사용자가 자신의 경험, 사실 확인, 말투 수정을 더하기 쉬운 "수정 가능한 초안"을 작성합니다.
- 참고 PDF가 있으면 문장 호흡, 말투, 단락 구성, 소제목 형식, 이모지 사용 방식만 참고합니다. 기존 문장을 그대로 복사하지 않습니다.
- 참고 PDF나 사용자 요청에서 이모지 사용이 보이면 새 초안에도 비슷한 빈도와 위치로 자연스럽게 반영합니다.
- 장소, 가격, 운영시간, 제품 사양처럼 변할 수 있는 정보는 단정하지 말고 사용자가 확인하도록 자연스럽게 남깁니다.
- 사진이 있으면 글의 흐름에 맞게 [사진 1], [사진그리드: 1,2], [사진슬라이드: 1,2,3] 태그를 포함합니다.

출력 형식:
- 마크다운으로 작성합니다.
- 제목, 도입, 본문 소제목, 사진 배치 태그, 마무리, "발행 전 내가 더하면 좋은 내용" 섹션을 포함합니다.
`.trim();

export const SYSTEM_PROMPT_B = `
당신은 BlogDraft의 썸네일 문구 제안 도우미입니다.

핵심 원칙:
- 과장 문구, 검색 노출 보장 표현, 낚시성 표현을 피합니다.
- 사용자가 직접 만든 것처럼 자연스럽게 수정하기 쉬운 짧은 문구를 제안합니다.
- 참고 썸네일이 있으면 글자 위치, 정렬 방향, 문구 줄 수, 문구 길이, 여백, 어둡게 처리, 텍스트 배경/그림자 느낌을 강하게 참고합니다.
- 특정 이미지나 디자인을 그대로 복제하지 말고 구성과 분위기만 참고합니다.

JSON으로만 응답하세요.
`.trim();

export async function generatePdfBriefing(ai: GoogleGenAI, pdfFile: any | null) {
  if (!pdfFile) return "";
  try {
    const response = await generateContentWithModelFallback(
      ai,
      {
        contents: {
          parts: [
            { inlineData: { mimeType: "application/pdf", data: pdfFile.buffer.toString("base64") } },
            {
              text: "첨부된 PDF를 문장 호흡, 말투, 단락/소제목 구성, 이모지 사용 방식, 새 초안에 참고할 점 기준으로 4줄 이내로 브리핑하세요. 기존 문장을 그대로 인용하지 마세요.",
            },
          ],
        },
        config: { systemInstruction: "블로그 글 스타일을 간단히 분석하는 편집 도우미입니다.", temperature: 0.2 },
      },
      30000
    );
    return response.text?.trim() || "";
  } catch {
    return "PDF 참고자료를 첨부했습니다. 문장 호흡, 말투, 단락 구성과 표현 방식은 초안 생성에 참고됩니다.";
  }
}

export async function generateThumbnailData(args: {
  ai: GoogleGenAI;
  selectedPhoto?: any | null;
  referenceThumbnail?: any | null;
  blogContent: string;
  userRequest: string;
}) {
  const parts: any[] = [];
  if (args.selectedPhoto) {
    parts.push({ inlineData: { mimeType: args.selectedPhoto.mimetype || "image/jpeg", data: args.selectedPhoto.buffer.toString("base64") } });
    parts.push({ text: "[대표 사진] 썸네일 배경으로 선택된 이미지입니다." });
  }
  if (args.referenceThumbnail) {
    parts.push({ inlineData: { mimeType: args.referenceThumbnail.mimetype || "image/jpeg", data: args.referenceThumbnail.buffer.toString("base64") } });
    parts.push({ text: "[참고 썸네일] 매우 중요한 스타일 참고자료입니다. 텍스트 위치, 줄 수, 문구 길이, 여백, 대비, 배경 어둡게 처리, 그림자/박스 느낌을 최대한 비슷하게 제안하세요." });
  }
  parts.push({
    text: `
블로그 초안 일부:
${args.blogContent.slice(0, 1600)}

사용자 요청사항:
${args.userRequest || "없음"}

참고 썸네일이 있으면 문구 길이와 layout_position을 참고 이미지에 최대한 가깝게 맞추세요.
`.trim(),
  });

  const fallback = { thumbnail_main_text: "내가 완성하는 기록", thumbnail_sub_text: "초안에 경험을 더해 정리", layout_position: "CENTER" };
  try {
    const response = await generateContentWithModelFallback(
      args.ai,
      {
        contents: { parts },
        config: {
          systemInstruction: SYSTEM_PROMPT_B,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              thumbnail_main_text: { type: Type.STRING },
              thumbnail_sub_text: { type: Type.STRING },
              layout_position: { type: Type.STRING },
            },
            required: ["thumbnail_main_text", "thumbnail_sub_text", "layout_position"],
          },
        },
      },
      30000
    );
    if (!response.text) return fallback;
    const parsed = JSON.parse(response.text.trim());
    return {
      thumbnail_main_text: parsed.thumbnail_main_text || fallback.thumbnail_main_text,
      thumbnail_sub_text: parsed.thumbnail_sub_text || fallback.thumbnail_sub_text,
      layout_position: ["CENTER", "BOTTOM_LEFT", "TOP_BANNER"].includes(parsed.layout_position) ? parsed.layout_position : "CENTER",
    };
  } catch {
    return fallback;
  }
}
