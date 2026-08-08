import { AIProviderName, ApiKeySource, BlogGenerationInput, BlogGenerationResult, ThumbnailRecommendationInput, ThumbnailRecommendationResult } from "./types";
import { createGeminiProvider, GEMINI_DEFAULT_MODEL } from "./geminiProvider";

export const DEFAULT_MODELS = {
  gemini: GEMINI_DEFAULT_MODEL,
} as const;

export function normalizeProvider(value: unknown): AIProviderName {
  return value === "openai" ? "openai" : "gemini";
}

export function resolveProviderApiKey(provider: AIProviderName, userApiKey?: string) {
  if (provider === "openai") {
    throw new Error("OPENAI_COMING_SOON: OpenAI는 준비 중입니다. 현재는 Gemini로만 생성할 수 있습니다.");
  }

  const trimmedUserKey = userApiKey?.trim();
  if (trimmedUserKey) {
    return { apiKey: trimmedUserKey, apiKeySource: "user" as ApiKeySource };
  }

  const serverKey = process.env.GEMINI_API_KEY;
  if (!serverKey?.trim()) {
    throw new Error("GEMINI_SERVER_KEY_MISSING: Gemini 서버 API를 사용할 수 없습니다. 계속 이용하려면 개인 Gemini API Key를 입력해 주세요.");
  }

  return { apiKey: serverKey.trim(), apiKeySource: "server" as ApiKeySource };
}

function createProvider(provider: AIProviderName, apiKey: string) {
  if (provider === "openai") {
    throw new Error("OPENAI_COMING_SOON: OpenAI는 준비 중입니다. 현재는 Gemini로만 생성할 수 있습니다.");
  }
  return createGeminiProvider(apiKey);
}

export async function generateBlogWithProvider(input: Omit<BlogGenerationInput, "apiKey" | "apiKeySource"> & { userApiKey?: string }): Promise<BlogGenerationResult> {
  const { apiKey, apiKeySource } = resolveProviderApiKey(input.provider, input.userApiKey);
  return createProvider(input.provider, apiKey).generateBlog({ ...input, apiKey, apiKeySource });
}

export async function recommendThumbnailWithProvider(
  input: Omit<ThumbnailRecommendationInput, "apiKey" | "apiKeySource"> & { userApiKey?: string }
): Promise<ThumbnailRecommendationResult> {
  const { apiKey, apiKeySource } = resolveProviderApiKey(input.provider, input.userApiKey);
  return createProvider(input.provider, apiKey).recommendThumbnail({ ...input, apiKey, apiKeySource });
}

export function getFriendlyProviderError(error: any, providerHint?: AIProviderName) {
  const message = (error?.message || "").toString();
  const status = (error?.status || error?.code || "").toString();
  const provider = message.includes("OPENAI") ? "openai" : message.includes("GEMINI") ? "gemini" : providerHint;
  const label = provider === "openai" ? "OpenAI" : provider === "gemini" ? "Gemini" : "AI";

  if (message.includes("OPENAI_COMING_SOON")) return { status: 400, message: message.replace(/^[A-Z_]+:\s*/, "") };
  if (message.includes("SERVER_KEY_MISSING")) return { status: 400, message: message.replace(/^[A-Z_]+:\s*/, "") };
  if (message.includes("TIMEOUT_ERROR")) return { status: 504, message: "서버 응답 시간이 초과되었습니다. 파일 수나 용량을 줄여 다시 시도해 주세요." };
  if (message.includes("JSON_PARSE_ERROR")) return { status: 502, message: "AI 응답 형식을 확인하지 못했습니다. 다시 시도해 주세요." };
  if (message.includes("FILE_PROCESSING_ERROR")) return { status: 400, message: "업로드한 파일을 처리하지 못했습니다. 파일 형식과 용량을 확인해 주세요." };
  if (message.includes("429") || message.includes("rate_limit") || message.includes("RESOURCE_EXHAUSTED") || message.includes("Quota")) {
    return { status: 429, message: `${label} 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.` };
  }
  if (message.includes("billing") || message.includes("insufficient_quota") || message.includes("credit")) {
    return { status: 402, message: `${label} 계정의 사용량 또는 결제 설정을 확인해 주세요.` };
  }
  if (message.includes("API key") || message.includes("api_key") || message.includes("API_KEY_INVALID") || status === "401" || status === "403") {
    return { status: 400, message: `${label} API Key가 올바르지 않습니다. 키와 모델 사용 권한을 확인해 주세요.` };
  }
  if (message.includes("model") || message.includes("not found") || message.includes("not supported") || status === "404") {
    return { status: 400, message: `선택한 ${label} 모델을 현재 API Key로 사용할 수 없습니다.` };
  }
  if (message.includes("File too large") || message.includes("LIMIT_FILE_SIZE") || message.includes("Payload Too Large")) {
    return { status: 413, message: "업로드한 파일이 너무 큽니다. 사진 또는 PDF 용량을 줄여 다시 시도해 주세요." };
  }
  if (message.includes("fetch failed") || message.includes("ENOTFOUND") || message.includes("ECONNRESET")) {
    return { status: 502, message: "서버가 선택한 AI 제공자에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  return { status: 500, message: "서버 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
}
