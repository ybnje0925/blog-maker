import { generateThumbnailData, getAIClient, getFriendlyApiError, runMiddleware, upload } from "../src/server/blogdraftApi";

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 300,
};

const uploadMiddleware = upload.fields([
  { name: "photo", maxCount: 1 },
  { name: "referenceThumbnail", maxCount: 1 },
]);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "POST 요청만 지원합니다." });
  }

  try {
    await runMiddleware(req, res, uploadMiddleware);
    const ai = getAIClient(req.body.userApiKey);
    const files = req.files as { [fieldname: string]: any[] } | undefined;
    const selectedPhoto = files?.photo?.[0] || null;
    const referenceThumbnail = files?.referenceThumbnail?.[0] || null;
    const blogContent = req.body.blogContent || "";
    const userRequest = req.body.userRequest || "";
    const thumbnailData = await generateThumbnailData({ ai, selectedPhoto, referenceThumbnail, blogContent, userRequest });
    return res.status(200).json({ success: true, thumbnailData });
  } catch (error: any) {
    const friendly = getFriendlyApiError(error);
    return res.status(friendly.status).json({ success: false, error: friendly.message });
  }
}
