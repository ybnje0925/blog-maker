import {
  generateContentWithModelFallback,
  generatePdfBriefing,
  generateThumbnailData,
  getAIClient,
  getFriendlyApiError,
  runMiddleware,
  SYSTEM_PROMPT_A,
  upload,
} from "../src/server/blogdraftApi";

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 300,
};

const uploadMiddleware = upload.fields([
  { name: "photos", maxCount: 20 },
  { name: "pdf", maxCount: 1 },
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
    const photos = files?.photos || [];
    const pdfFile = files?.pdf?.[0] || null;
    const referenceThumbnail = files?.referenceThumbnail?.[0] || null;
    const tone = req.body.tone || "친근한 존댓말";
    const styleLevel = req.body.styleLevel || "3";
    const userRequest = req.body.userRequest || "";
    const thumbnailIndex = parseInt(req.body.thumbnailIndex || "0", 10);

    const parts: any[] = [];
    if (pdfFile) {
      parts.push({ inlineData: { mimeType: "application/pdf", data: pdfFile.buffer.toString("base64") } });
      parts.push({ text: `[내 글 스타일 참고자료] ${pdfFile.originalname} 파일이 첨부되었습니다. 기존 문장을 복사하지 말고 말투, 문장 호흡, 단락 구성, 이모지 사용 방식만 참고하세요.` });
    } else {
      parts.push({ text: "[내 글 스타일 참고자료] 첨부된 PDF가 없습니다." });
    }

    photos.forEach((photo, index) => {
      parts.push({ inlineData: { mimeType: photo.mimetype || "image/jpeg", data: photo.buffer.toString("base64") } });
      parts.push({ text: `[사진 ${index + 1}] ${photo.originalname || `사진 ${index + 1}`}` });
    });

    parts.push({
      text: `
입력 조건:
- 업로드 사진 수: ${photos.length}
- 기본 말투: ${tone}
- 표현 강도: ${styleLevel}/5
- 사용자 추가 요청사항: ${userRequest || "없음"}

사진과 기존 글을 바탕으로 내 말투에 가까운 블로그 초안을 만들고, 사용자가 경험과 사실 확인을 더해 완성할 수 있게 작성하세요.
`.trim(),
    });

    const blogResponse = await generateContentWithModelFallback(
      ai,
      {
        contents: { parts },
        config: { systemInstruction: SYSTEM_PROMPT_A, temperature: 0.7 },
      },
      60000
    );

    const blogContent = blogResponse.text || "# 블로그 초안\n\n초안을 생성하지 못했습니다. 입력 자료를 줄여 다시 시도해 주세요.";
    const pdfBriefing = await generatePdfBriefing(ai, pdfFile);
    const selectedPhoto = photos[thumbnailIndex] || photos[0] || null;
    const thumbnailData = await generateThumbnailData({ ai, selectedPhoto, referenceThumbnail, blogContent, userRequest });

    return res.status(200).json({ success: true, blogContent, thumbnailData, pdfBriefing, selectedThumbnailIndex: thumbnailIndex });
  } catch (error: any) {
    const friendly = getFriendlyApiError(error);
    return res.status(friendly.status).json({ success: false, error: friendly.message });
  }
}
