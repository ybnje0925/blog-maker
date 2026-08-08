import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

function normalizeUploadBody(body: unknown): HandleUploadPresignedBody {
  if (typeof body === "string") return JSON.parse(body) as HandleUploadPresignedBody;
  return body as HandleUploadPresignedBody;
}

async function readUploadBody(req: any): Promise<HandleUploadPresignedBody> {
  if (req.body) return normalizeUploadBody(req.body);

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return normalizeUploadBody(rawBody);
}

function getHeaderValue(req: any, name: string) {
  const value = req.headers?.[name.toLowerCase()] ?? req.headers?.[name];
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : undefined;
}

function getOidcToken(req: any) {
  return getHeaderValue(req, "x-vercel-oidc-token")?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim();
}

function getBlobStoreId() {
  return process.env.BLOB_STORE_ID?.trim();
}

function getUploadPayload(clientPayload: string | null) {
  return clientPayload ? JSON.parse(clientPayload) : {};
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 지원합니다." });
  }

  try {
    const body = await readUploadBody(req);
    const oidcToken = getOidcToken(req);
    const storeId = getBlobStoreId();

    console.info("blob_upload_token_request", {
      type: (body as any)?.type,
      hasBlobStoreId: Boolean(storeId),
      hasVercelOidcToken: Boolean(process.env.VERCEL_OIDC_TOKEN),
      vercelEnv: process.env.VERCEL_ENV || "local",
    });
    console.info("blob_oidc_check", {
      hasVercelOidcHeader: Boolean(getHeaderValue(req, "x-vercel-oidc-token")),
    });

    if (!oidcToken || !storeId) {
      throw new Error("Vercel Blob OIDC token or BLOB_STORE_ID is missing.");
    }

    const jsonResponse = await handleUploadPresigned({
      body,
      request: req,
      getSignedToken: async (pathname, clientPayload) => {
        const payload = getUploadPayload(clientPayload);
        const tokenPayload = JSON.stringify({
          kind: payload.kind || "file",
          originalName: payload.originalName || "",
          order: payload.order ?? null,
        });

        return {
          token: await issueSignedToken({
            pathname,
            operations: ["put"],
            allowedContentTypes: ALLOWED_CONTENT_TYPES,
            oidcToken,
            storeId,
          }),
          urlOptions: {
            allowedContentTypes: ALLOWED_CONTENT_TYPES,
            addRandomSuffix: true,
            tokenPayload,
          },
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
