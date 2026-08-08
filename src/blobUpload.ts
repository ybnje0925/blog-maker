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

function blobUploadError() {
  return new Error(
    "임시 파일 업로드에 실패했습니다. 파일 용량 문제가 아니라 Blob 연결 또는 인증 상태를 확인해야 할 수 있습니다. 새로고침 후 다시 시도해 주세요."
  );
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
    throw blobUploadError();
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
