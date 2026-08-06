import { GoogleGenAI, Type } from "@google/genai";
import { ThumbnailData } from "../../types";
import { buildBlogUserPrompt, buildThumbnailUserPrompt } from "./prompts/commonBlogPrompt";
import { GEMINI_BLOG_PROMPT, GEMINI_THUMBNAIL_PROMPT } from "./prompts/geminiBlogPrompt";
import { AIProvider, BlogGenerationInput, InMemoryUploadFile } from "./types";

export const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";
const GEMINI_MODEL_CANDIDATES = Array.from(
  new Set([process.env.GEMINI_MODEL, "gemini-3.6-flash", "gemini-3.5-flash", GEMINI_DEFAULT_MODEL].filter(Boolean))
) as string[];

function withTimeout<T>(promise: Promise<T>, timeoutMs = 60000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TIMEOUT_ERROR")), timeoutMs);
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

function inlineData(file: InMemoryUploadFile) {
  return {
    inlineData: {
      mimeType: file.mimetype || "application/octet-stream",
      data: file.buffer.toString("base64"),
    },
  };
}

function isGeminiAuthError(error: any) {
  const message = (error?.message || "").toString();
  const status = (error?.status || "").toString();
  return (
    status === "401" ||
    status === "403" ||
    message.includes("API key not valid") ||
    message.includes("API_KEY_INVALID") ||
    message.includes("PERMISSION_DENIED")
  );
}

function isGeminiModelFallbackError(error: any) {
  if (isGeminiAuthError(error)) return false;
  const message = (error?.message || "").toString();
  const status = (error?.status || "").toString();
  return (
    status === "404" ||
    status === "400" ||
    message.includes("not found") ||
    message.includes("not supported") ||
    message.includes("not available") ||
    message.includes("INVALID_ARGUMENT") ||
    message.includes("model")
  );
}

function buildGeminiConfig(model: string, config: Record<string, unknown>) {
  if (model.startsWith("gemini-3.")) {
    const { temperature: _temperature, ...withoutSampling } = config;
    return withoutSampling;
  }
  return config;
}

async function generateGeminiWithFallback(ai: GoogleGenAI, params: { contents: any; config?: Record<string, unknown> }, timeoutMs: number) {
  let lastError: any = null;
  for (const model of GEMINI_MODEL_CANDIDATES) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config ? buildGeminiConfig(model, params.config) : undefined,
        } as any),
        timeoutMs
      );
      return { response, model };
    } catch (error: any) {
      lastError = error;
      if (!isGeminiModelFallbackError(error)) break;
    }
  }
  throw lastError;
}

function safeThumbnailData(parsed: any): ThumbnailData {
  return {
    thumbnail_main_text: parsed?.thumbnail_main_text || "오늘의 기록",
    thumbnail_sub_text: parsed?.thumbnail_sub_text || "경험을 더해 완성하는 글",
    layout_position: ["CENTER", "BOTTOM_LEFT", "TOP_BANNER"].includes(parsed?.layout_position) ? parsed.layout_position : "CENTER",
  };
}

function buildGeminiParts(input: BlogGenerationInput) {
  const parts: any[] = [];
  if (input.pdfFile) {
    parts.push(inlineData(input.pdfFile));
    parts.push({ text: `[참고 PDF] ${input.pdfFile.originalname} 파일을 첨부했습니다. 말투와 구성만 참고하고 문장을 복사하지 마세요.` });
  } else {
    parts.push({ text: "[참고 PDF] 첨부된 PDF가 없습니다." });
  }

  input.photos.forEach((photo, index) => {
    parts.push(inlineData(photo));
    parts.push({ text: `[사진 ${index + 1}] ${photo.originalname || `사진 ${index + 1}`}` });
  });

  if (input.referenceThumbnail) {
    parts.push(inlineData(input.referenceThumbnail));
    parts.push({ text: "[참고 썸네일] 문구 길이, 배치, 여백과 분위기만 참고하세요." });
  }

  parts.push({
    text: buildBlogUserPrompt({
      photoCount: input.photos.length,
      tone: input.tone,
      styleLevel: input.styleLevel,
      userRequest: input.userRequest,
      hasPdf: Boolean(input.pdfFile),
    }),
  });

  return parts;
}

export function createGeminiProvider(apiKey: string): AIProvider {
  const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "blogdraft" } } });

  return {
    async generateBlog(input) {
      const { response, model } = await generateGeminiWithFallback(
        ai,
        {
          contents: { parts: buildGeminiParts(input) },
          config: { systemInstruction: GEMINI_BLOG_PROMPT, temperature: 0.7 },
        },
        90000
      );

      const blogContent = response.text?.trim() || "# 블로그 초안\n\nAI 초안을 생성하지 못했습니다. 입력 자료를 확인한 뒤 다시 시도해 주세요.";
      const pdfBriefing = input.pdfFile ? await briefPdf(ai, model, input.pdfFile) : "";
      const selectedPhoto = input.photos[input.thumbnailIndex] || input.photos[0] || null;
      const thumbnail = await this.recommendThumbnail({
        provider: input.provider,
        apiKey: input.apiKey,
        apiKeySource: input.apiKeySource,
        selectedPhoto,
        referenceThumbnail: input.referenceThumbnail,
        blogContent,
        userRequest: input.userRequest,
      });

      return {
        blogContent,
        thumbnailData: thumbnail.thumbnailData,
        selectedThumbnailIndex: input.thumbnailIndex,
        pdfBriefing,
        provider: "gemini",
        model,
      };
    },

    async recommendThumbnail(input) {
      const parts: any[] = [];
      if (input.selectedPhoto) parts.push(inlineData(input.selectedPhoto));
      if (input.referenceThumbnail) parts.push(inlineData(input.referenceThumbnail));
      parts.push({ text: buildThumbnailUserPrompt(input.blogContent, input.userRequest) });

      const { response, model } = await generateGeminiWithFallback(
        ai,
        {
          contents: { parts },
          config: {
            systemInstruction: GEMINI_THUMBNAIL_PROMPT,
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
        45000
      );

      try {
        return { thumbnailData: safeThumbnailData(JSON.parse(response.text?.trim() || "{}")), provider: "gemini", model };
      } catch {
        throw new Error("JSON_PARSE_ERROR");
      }
    },
  };
}

async function briefPdf(ai: GoogleGenAI, model: string, pdfFile: InMemoryUploadFile) {
  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model,
        contents: {
          parts: [
            inlineData(pdfFile),
            {
              text: "첨부 PDF를 문장 호흡, 말투, 단락 구성, 소제목 방식 중심으로 4줄 이내로 요약해 주세요. 원문 문장을 그대로 인용하지 마세요.",
            },
          ],
        },
        config: { systemInstruction: "블로그 글 스타일을 간단히 분석하는 편집 도우미입니다.", temperature: 0.2 },
      }),
      30000
    );
    return response.text?.trim() || "";
  } catch {
    return "PDF 참고자료를 첨부했습니다. 말투와 구성은 초안 작성에 참고됩니다.";
  }
}
