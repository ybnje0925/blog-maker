import { get } from "@vercel/blob";

export interface ServerBlobFile {
  url: string;
  mimeType: string;
  originalName: string;
  order?: number;
  size?: number;
}

export interface ServerBlobAuthOptions {
  oidcToken?: string;
  storeId?: string;
}

export interface InMemoryUploadFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

function getBlobAccess(url: string) {
  try {
    return new URL(url).hostname.includes(".private.blob.vercel-storage.com") ? "private" : "public";
  } catch {
    return "public";
  }
}

function isVercelBlobUrl(url: string) {
  try {
    return new URL(url).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function blobToUploadFile(file: ServerBlobFile, options: ServerBlobAuthOptions = {}): Promise<InMemoryUploadFile> {
  if (isVercelBlobUrl(file.url)) {
    const result = await get(file.url, {
      access: getBlobAccess(file.url),
      oidcToken: options.oidcToken,
      storeId: options.storeId,
    });

    if (!result || result.statusCode !== 200) {
      throw new Error(`Blob 파일을 불러오지 못했습니다. ${file.originalName}`);
    }

    const arrayBuffer = await new Response(result.stream).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return {
      buffer,
      mimetype: file.mimeType || result.blob.contentType || "application/octet-stream",
      originalname: file.originalName,
      size: file.size || buffer.length,
    };
  }

  const response = await fetch(file.url);
  if (!response.ok) {
    throw new Error(`Blob 파일을 불러오지 못했습니다. ${file.originalName}`);
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

export async function blobListToUploadFiles(files: ServerBlobFile[] = [], options: ServerBlobAuthOptions = {}) {
  const sorted = [...files].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return Promise.all(sorted.map((file) => blobToUploadFile(file, options)));
}
