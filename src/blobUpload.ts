import { upload } from "@vercel/blob/client";
import { BlobFileMetadata } from "./types";

export interface BlobUploadProgress {
  label: string;
  fileIndex: number;
  fileCount: number;
  percentage: number;
}

function uploadPath(kind: string, fileName: string, index: number) {
  const safeName = fileName.replace(/[^\w.-]+/g, "_") || "file";
  return `blogdraft/tmp/${Date.now()}-${index}-${safeName}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("파일을 서버 전송 형식으로 준비하지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

export async function uploadFileToBlob(
  kind: string,
  file: File,
  index: number,
  total: number,
  onProgress?: (progress: BlobUploadProgress) => void
): Promise<BlobFileMetadata> {
  try {
    const blob = await upload(uploadPath(kind, file.name, index), file, {
      access: "public",
      contentType: file.type,
      handleUploadUrl: "/api/blob-upload",
      clientPayload: JSON.stringify({ kind, originalName: file.name, order: index }),
      onUploadProgress: ({ percentage }) => {
        onProgress?.({ label: file.name, fileIndex: index + 1, fileCount: total, percentage });
      },
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
      mimeType: blob.contentType || file.type,
      originalName: file.name,
      order: index,
      size: file.size,
    };
  } catch {
    onProgress?.({ label: file.name, fileIndex: index + 1, fileCount: total, percentage: 100 });
    return {
      url: await fileToDataUrl(file),
      mimeType: file.type || "application/octet-stream",
      originalName: file.name,
      order: index,
      size: file.size,
    };
  }
}

export async function deleteBlobFiles(files: BlobFileMetadata[]) {
  const urls = files.map((file) => file.url).filter(Boolean);
  if (urls.length === 0) return;

  await fetch("/api/blob-cleanup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls }),
  }).catch(() => undefined);
}
