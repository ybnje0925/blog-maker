import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 지원합니다." });
  }

  try {
    const body = req.body as HandleUploadBody;
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const payload = clientPayload ? JSON.parse(clientPayload) : {};
        const allowedContentTypes = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "application/pdf",
        ];

        return {
          allowedContentTypes,
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
    return res.status(400).json({ error: "임시 파일 업로드를 준비하지 못했습니다. 서버 직접 전송 방식으로 다시 시도합니다." });
  }
}
