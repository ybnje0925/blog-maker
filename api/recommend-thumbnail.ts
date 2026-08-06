import { blobToUploadFile } from "../src/server/blobFiles";
import { getFriendlyProviderError, normalizeProvider, recommendThumbnailWithProvider } from "../src/server/ai/provider";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
  maxDuration: 300,
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "POST 요청만 지원합니다." });
  }

  const provider = normalizeProvider(req.body.aiProvider);

  try {
    const selectedPhoto = req.body.photo ? await blobToUploadFile(req.body.photo) : null;
    const referenceThumbnail = req.body.referenceThumbnail ? await blobToUploadFile(req.body.referenceThumbnail) : null;
    const result = await recommendThumbnailWithProvider({
      provider,
      userApiKey: req.body.userApiKey,
      selectedPhoto,
      referenceThumbnail,
      blogContent: req.body.blogContent || "",
      userRequest: req.body.userRequest || "",
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    const friendly = getFriendlyProviderError(error, provider);
    return res.status(friendly.status).json({ success: false, error: friendly.message });
  }
}
