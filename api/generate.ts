import { blobListToUploadFiles, blobToUploadFile } from "../src/server/blobFiles.js";
import { generateBlogWithProvider, getFriendlyProviderError, normalizeProvider } from "../src/server/ai/provider.js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
  maxDuration: 300,
};

function getHeaderValue(req: any, name: string) {
  const value = req.headers?.[name.toLowerCase()] ?? req.headers?.[name];
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : undefined;
}

function getBlobAuthOptions(req: any) {
  return {
    oidcToken: getHeaderValue(req, "x-vercel-oidc-token")?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim(),
    storeId: process.env.BLOB_STORE_ID?.trim(),
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "POST 요청만 지원합니다." });
  }

  const provider = normalizeProvider(req.body.aiProvider);

  try {
    const blobAuthOptions = getBlobAuthOptions(req);
    const photos = await blobListToUploadFiles(req.body.photos || [], blobAuthOptions);
    const pdfFile = req.body.pdf ? await blobToUploadFile(req.body.pdf, blobAuthOptions) : null;
    const referenceThumbnail = req.body.referenceThumbnail ? await blobToUploadFile(req.body.referenceThumbnail, blobAuthOptions) : null;
    const thumbnailIndex = parseInt(req.body.thumbnailIndex || "0", 10);

    const result = await generateBlogWithProvider({
      provider,
      userApiKey: req.body.userApiKey,
      photos,
      pdfFile,
      referenceThumbnail,
      tone: req.body.tone || "친근한 존댓말",
      styleLevel: req.body.styleLevel || "3",
      userRequest: req.body.userRequest || "",
      thumbnailIndex,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    const friendly = getFriendlyProviderError(error, provider);
    return res.status(friendly.status).json({ success: false, error: friendly.message });
  }
}
