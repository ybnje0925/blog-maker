export const MAX_PHOTO_COUNT = 30;
export const MAX_ORIGINAL_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export const MAX_REFERENCE_THUMBNAIL_BYTES = 5 * 1024 * 1024;
export const MAX_ORIGINAL_SELECTION_BYTES = 60 * 1024 * 1024;
export const MAX_OPTIMIZED_PHOTOS_BYTES = 20 * 1024 * 1024;
export const MAX_GENERATE_REQUEST_BODY_BYTES = 4 * 1024 * 1024;

export const MAX_IMAGE_SIDE = 1600;
export const IMAGE_QUALITY = 0.74;
export const TARGET_PHOTO_BYTES = 700 * 1024;

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
