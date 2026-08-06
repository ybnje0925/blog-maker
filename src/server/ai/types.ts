import { ThumbnailData } from "../../types";

export type AIProviderName = "openai" | "gemini";
export type ApiKeySource = "user" | "server";

export interface InMemoryUploadFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export interface BlogGenerationInput {
  provider: AIProviderName;
  apiKey?: string;
  apiKeySource: ApiKeySource;
  photos: InMemoryUploadFile[];
  pdfFile: InMemoryUploadFile | null;
  referenceThumbnail: InMemoryUploadFile | null;
  tone: string;
  styleLevel: string;
  userRequest: string;
  thumbnailIndex: number;
}

export interface ThumbnailRecommendationInput {
  provider: AIProviderName;
  apiKey?: string;
  apiKeySource: ApiKeySource;
  selectedPhoto?: InMemoryUploadFile | null;
  referenceThumbnail?: InMemoryUploadFile | null;
  blogContent: string;
  userRequest: string;
}

export interface BlogGenerationResult {
  blogContent: string;
  thumbnailData: ThumbnailData;
  selectedThumbnailIndex: number;
  pdfBriefing?: string;
  provider: AIProviderName;
  model?: string;
}

export interface ThumbnailRecommendationResult {
  thumbnailData: ThumbnailData;
  provider: AIProviderName;
  model?: string;
}

export interface AIProvider {
  generateBlog(input: BlogGenerationInput): Promise<BlogGenerationResult>;
  recommendThumbnail(input: ThumbnailRecommendationInput): Promise<ThumbnailRecommendationResult>;
}
