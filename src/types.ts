export interface UploadedPhoto {
  id: string;
  file: File;
  previewUrl: string;
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
}

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
  userApiKey: string;
  privacyConsent: boolean;
}
