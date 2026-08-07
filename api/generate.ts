import { blobListToUploadFiles, blobToUploadFile } from "../src/server/blobFiles";
import { generateBlogWithProvider, getFriendlyProviderError, normalizeProvider } from "../src/server/ai/provider";

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
    const photos = await blobListToUploadFiles(req.body.photos || []);
    const pdfFile = req.body.pdf ? await blobToUploadFile(req.body.pdf) : null;
    const referenceThumbnail = req.body.referenceThumbnail ? await blobToUploadFile(req.body.referenceThumbnail) : null;
    const thumbnailIndex = parseInt(req.body.thumbnailIndex || "0", 10);

    const result = await generateBlogWithProvider({
      provider,
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
