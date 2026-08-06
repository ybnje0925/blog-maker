import {
  IMAGE_QUALITY,
  MAX_IMAGE_SIDE,
  TARGET_PHOTO_BYTES,
} from "./uploadLimits";

export interface OptimizedImageResult {
  file: File;
  originalName: string;
  originalSize: number;
  optimizedSize: number;
  optimizedMimeType: string;
}

function getOutputType(file: File) {
  if (file.type === "image/webp") return "image/webp";
  return "image/jpeg";
}

function extensionForMime(mimeType: string) {
  return mimeType === "image/webp" ? "webp" : "jpg";
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function optimizeImageFile(file: File): Promise<OptimizedImageResult> {
  const lowerName = file.name.toLowerCase();

  if (file.type === "image/gif" || lowerName.endsWith(".gif")) {
    throw new Error("GIF는 현재 첫 프레임 변환을 안정적으로 지원하지 않습니다. JPG, PNG, WebP 파일로 변환한 뒤 업로드해 주세요.");
  }

  if (file.type === "image/heic" || file.type === "image/heif" || lowerName.endsWith(".heic") || lowerName.endsWith(".heif")) {
    throw new Error("HEIC/HEIF는 브라우저에서 직접 변환하지 못할 수 있습니다. 변환에 실패하면 JPG 또는 WebP로 바꾼 뒤 업로드해 주세요.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`${file.name} 파일을 브라우저에서 이미지로 읽지 못했습니다. JPG, PNG, WebP 형식으로 다시 시도해 주세요.`);
  }

  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    bitmap.close?.();
    throw new Error("브라우저에서 이미지 최적화 캔버스를 만들지 못했습니다.");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const outputType = getOutputType(file);
  let blob = await canvasToBlob(canvas, outputType, IMAGE_QUALITY);
  if (!blob && outputType !== "image/jpeg") {
    blob = await canvasToBlob(canvas, "image/jpeg", IMAGE_QUALITY);
  }
  if (!blob) {
    throw new Error(`${file.name} 파일을 최적화하지 못했습니다.`);
  }

  const finalType = blob.type || outputType;
  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_") || "photo";
  const optimizedFile = new File([blob], `${baseName}.${extensionForMime(finalType)}`, {
    type: finalType,
    lastModified: Date.now(),
  });

  return {
    file: optimizedFile,
    originalName: file.name,
    originalSize: file.size,
    optimizedSize: optimizedFile.size,
    optimizedMimeType: finalType,
  };
}

export function getOptimizationNote(size: number) {
  if (size <= TARGET_PHOTO_BYTES) return "목표 용량 이하로 최적화됨";
  return "목표보다 크지만 전체 제한 안에서 업로드 가능";
}
