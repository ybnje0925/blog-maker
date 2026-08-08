import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

function normalizeUploadBody(body: unknown): HandleUploadBody {
  if (typeof body === "string") return JSON.parse(body) as HandleUploadBody;
  return body as HandleUploadBody;
}

async function readUploadBody(req: any): Promise<HandleUploadBody> {
  if (req.body) return normalizeUploadBody(req.body);

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return normalizeUploadBody(rawBody);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 지원합니다." });
  }

  try {
    const body = await readUploadBody(req);
    console.info("blob_upload_token_request", {
      type: (body as any)?.type,
      hasBlobStoreId: Boolean(process.env.BLOB_STORE_ID),
      hasVercelOidcToken: Boolean(process.env.VERCEL_OIDC_TOKEN),
      vercelEnv: process.env.VERCEL_ENV || "local",
    });
    console.info("blob_oidc_check", {
      hasVercelOidcHeader: Boolean(req.headers["x-vercel-oidc-token"]),
    });

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const payload = clientPayload ? JSON.parse(clientPayload) : {};

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            kind: payload.kind || "file",
            originalName: payload.originalName || "",
            order: payload.order ?? null,
          }),
        };
      },
      onUploadCompleted: async () => undefined,
    });

    return res.status(200).json(jsonResponse);
  } catch (error: any) {
    console.error("blob_upload_token_error", {
      message: error?.message || String(error),
      hasBlobStoreId: Boolean(process.env.BLOB_STORE_ID),
      hasVercelOidcToken: Boolean(process.env.VERCEL_OIDC_TOKEN),
      vercelEnv: process.env.VERCEL_ENV || "local",
    });
    return res.status(400).json({ error: "임시 파일 업로드를 준비하지 못했습니다. Blob 연결 또는 인증 상태를 확인해 주세요." });
  }
}
