export interface ServerBlobFile {
  url: string;
  mimeType: string;
  originalName: string;
  order?: number;
  size?: number;
}

export interface InMemoryUploadFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export async function blobToUploadFile(file: ServerBlobFile): Promise<InMemoryUploadFile> {
  const response = await fetch(file.url);
  if (!response.ok) {
    throw new Error(`Blob 파일을 불러오지 못했습니다: ${file.originalName}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return {
    buffer,
    mimetype: file.mimeType || response.headers.get("content-type") || "application/octet-stream",
    originalname: file.originalName,
    size: file.size || buffer.length,
  };
}

export async function blobListToUploadFiles(files: ServerBlobFile[] = []) {
  const sorted = [...files].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return Promise.all(sorted.map(blobToUploadFile));
}
