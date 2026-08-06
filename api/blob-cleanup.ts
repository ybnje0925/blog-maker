import { del } from "@vercel/blob";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "POST 요청만 지원합니다." });
  }

  try {
    const urls = Array.isArray(req.body?.urls) ? req.body.urls.filter(Boolean) : [];
    if (urls.length > 0) {
      await del(urls);
    }
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || "임시 Blob 삭제 중 오류가 발생했습니다." });
  }
}
