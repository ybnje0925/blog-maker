import { AIProviderName, ApiKeySource, BlogGenerationInput, BlogGenerationResult, ThumbnailRecommendationInput, ThumbnailRecommendationResult } from "./types";
import { createGeminiProvider, GEMINI_DEFAULT_MODEL } from "./geminiProvider";

export const DEFAULT_MODELS = {
  gemini: GEMINI_DEFAULT_MODEL,
} as const;

export function normalizeProvider(value: unknown): AIProviderName {
  return value === "openai" ? "openai" : "gemini";
}

export function resolveProviderApiKey(provider: AIProviderName) {
  if (provider === "openai") {
    throw new Error("OPENAI_COMING_SOON: OpenAI 기능은 준비 중입니다. 현재는 Gemini Flash로 생성해 주세요.");
  }

  const serverKey = process.env.GEMINI_API_KEY;
  if (!serverKey?.trim()) {
    throw new Error("GEMINI_SERVER_KEY_MISSING: Gemini 서버 API Key가 설정되어 있지 않습니다.");
  }

  return { apiKey: serverKey.trim(), apiKeySource: "server" as ApiKeySource };
}

function createProvider(provider: AIProviderName, apiKey: string) {
  if (provider === "openai") {
    throw new Error("OPENAI_COMING_SOON: OpenAI 기능은 준비 중입니다. 현재는 Gemini Flash로 생성해 주세요.");
  }
  return createGeminiProvider(apiKey);
}

export async function generateBlogWithProvider(input: Omit<BlogGenerationInput, "apiKey" | "apiKeySource">): Promise<BlogGenerationResult> {
  const { apiKey, apiKeySource } = resolveProviderApiKey(input.provider);
  return createProvider(input.provider, apiKey).generateBlog({ ...input, apiKey, apiKeySource });
}

export async function recommendThumbnailWithProvider(
  input: Omit<ThumbnailRecommendationInput, "apiKey" | "apiKeySource">
): Promise<ThumbnailRecommendationResult> {
  const { apiKey, apiKeySource } = resolveProviderApiKey(input.provider);
  return createProvider(input.provider, apiKey).recommendThumbnail({ ...input, apiKey, apiKeySource });
}

export function getFriendlyProviderError(error: any, providerHint?: AIProviderName) {
  const message = (error?.message || "").toString();
  const status = (error?.status || error?.code || "").toString();
  const provider = message.includes("OPENAI") ? "openai" : message.includes("GEMINI") ? "gemini" : providerHint;
  const label = provider === "openai" ? "OpenAI" : provider === "gemini" ? "Gemini" : "AI";

  if (message.includes("OPENAI_COMING_SOON")) return { status: 400, message: message.replace(/^[A-Z_]+:\s*/, "") };
  if (message.includes("SERVER_KEY_MISSING")) return { status: 400, message: message.replace(/^[A-Z_]+:\s*/, "") };
  if (message.includes("TIMEOUT_ERROR")) return { status: 504, message: "?쒕쾭 ?묐떟 ?쒓컙??珥덇낵?섏뿀?듬땲?? ?뚯씪 ?섎굹 ?⑸웾??以꾩뿬 ?ㅼ떆 ?쒕룄??二쇱꽭??" };
  if (message.includes("JSON_PARSE_ERROR")) return { status: 502, message: "AI ?묐떟 ?뺤떇???뺤씤?섏? 紐삵뻽?듬땲?? ?ㅼ떆 ?쒕룄??二쇱꽭??" };
  if (message.includes("FILE_PROCESSING_ERROR")) return { status: 400, message: "?낅줈?쒗븳 ?뚯씪??泥섎━?섏? 紐삵뻽?듬땲?? ?뚯씪 ?뺤떇怨??⑸웾???뺤씤??二쇱꽭??" };
  if (message.includes("429") || message.includes("rate_limit") || message.includes("RESOURCE_EXHAUSTED") || message.includes("Quota")) {
    return { status: 429, message: `${label} ?붿껌 ?쒕룄瑜?珥덇낵?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??` };
  }
  if (message.includes("billing") || message.includes("insufficient_quota") || message.includes("credit")) {
    return { status: 402, message: `${label} 怨꾩젙???ъ슜???먮뒗 寃곗젣 ?ㅼ젙???뺤씤??二쇱꽭??` };
  }
  if (message.includes("API key") || message.includes("api_key") || message.includes("API_KEY_INVALID") || status === "401" || status === "403") {
    return { status: 400, message: `${label} API Key媛 ?щ컮瑜댁? ?딆뒿?덈떎. ?ㅼ? 紐⑤뜽 ?ъ슜 沅뚰븳???뺤씤??二쇱꽭??` };
  }
  if (message.includes("model") || message.includes("not found") || message.includes("not supported") || status === "404") {
    return { status: 400, message: `?좏깮??${label} 紐⑤뜽???꾩옱 API Key濡??ъ슜?????놁뒿?덈떎.` };
  }
  if (message.includes("File too large") || message.includes("LIMIT_FILE_SIZE") || message.includes("Payload Too Large")) {
    return { status: 413, message: "?낅줈?쒗븳 ?뚯씪???덈Т ?쎈땲?? ?ъ쭊 ?먮뒗 PDF ?⑸웾??以꾩뿬 ?ㅼ떆 ?쒕룄??二쇱꽭??" };
  }
  if (message.includes("fetch failed") || message.includes("ENOTFOUND") || message.includes("ECONNRESET")) {
    return { status: 502, message: "?쒕쾭媛 ?좏깮??AI ?쒓났?먯뿉 ?곌껐?섏? 紐삵뻽?듬땲?? ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??" };
  }

  return { status: 500, message: "?쒕쾭 泥섎━ 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??" };
}
