export interface UploadedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  originalName: string;
  originalSize: number;
  optimizedSize: number;
  optimizedMimeType: string;
}

export interface BlobFileMetadata {
  url: string;
  pathname?: string;
  mimeType: string;
  originalName: string;
  order?: number;
  size?: number;
}

export interface ThumbnailData {
  thumbnail_main_text: string;
  thumbnail_sub_text: string;
  layout_position: "CENTER" | "BOTTOM_LEFT" | "TOP_BANNER";
}

export interface GenerationResult {
  blogContent: string;
  thumbnailData: ThumbnailData;
  selectedThumbnailIndex: number;
  pdfBriefing?: string;
  provider?: AIProvider;
  model?: string;
}

export type AIProvider = "openai" | "gemini";

export interface FormState {
  photos: UploadedPhoto[];
  pdfFile: File | null;
  pdfFileName: string | null;
  referenceThumbnailFile: File | null;
  referenceThumbnailFileName: string | null;
  referenceThumbnailPreviewUrl: string | null;
  tone: string;
  styleLevel: number;
  userRequest: string;
  thumbnailIndex: number;
  aiProvider: AIProvider;
  openaiApiKey: string;
  geminiApiKey: string;
  rememberOpenaiApiKey: boolean;
  rememberGeminiApiKey: boolean;
  privacyConsent: boolean;
}
