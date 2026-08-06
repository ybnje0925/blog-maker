import OpenAI from "openai";
import { ThumbnailData } from "../../types";
import { buildBlogUserPrompt, buildThumbnailUserPrompt } from "./prompts/commonBlogPrompt";
import { OPENAI_BLOG_PROMPT, OPENAI_THUMBNAIL_PROMPT } from "./prompts/openaiBlogPrompt";
import { AIProvider, BlogGenerationInput, InMemoryUploadFile, ThumbnailRecommendationInput } from "./types";

export const OPENAI_DEFAULT_MODEL = "gpt-4.1-mini";

function withTimeout<T>(promise: Promise<T>, timeoutMs = 60000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TIMEOUT_ERROR")), timeoutMs);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function dataUrl(file: InMemoryUploadFile) {
  return `data:${file.mimetype || "application/octet-stream"};base64,${file.buffer.toString("base64")}`;
}

function parseThumbnailJson(text: string): ThumbnailData {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  return {
    thumbnail_main_text: parsed.thumbnail_main_text || "오늘의 기록",
    thumbnail_sub_text: parsed.thumbnail_sub_text || "경험을 더해 완성하는 글",
    layout_position: ["CENTER", "BOTTOM_LEFT", "TOP_BANNER"].includes(parsed.layout_position) ? parsed.layout_position : "CENTER",
  };
}

function buildOpenAIContent(input: BlogGenerationInput) {
  const content: any[] = [
    {
      type: "input_text",
      text: buildBlogUserPrompt({
        photoCount: input.photos.length,
        tone: input.tone,
        styleLevel: input.styleLevel,
        userRequest: input.userRequest,
        hasPdf: Boolean(input.pdfFile),
      }),
    },
  ];

  if (input.pdfFile) {
    content.push({
      type: "input_file",
      filename: input.pdfFile.originalname,
      file_data: dataUrl(input.pdfFile),
    });
    content.push({ type: "input_text", text: "첨부 PDF는 말투, 문장 호흡, 구성 참고용입니다. 문장을 그대로 복사하지 마세요." });
  }

  input.photos.forEach((photo, index) => {
    content.push({ type: "input_image", image_url: dataUrl(photo), detail: "auto" });
    content.push({ type: "input_text", text: `[사진 ${index + 1}] ${photo.originalname || `사진 ${index + 1}`}` });
  });

  if (input.referenceThumbnail) {
    content.push({ type: "input_image", image_url: dataUrl(input.referenceThumbnail), detail: "auto" });
    content.push({ type: "input_text", text: "참고 썸네일은 문구 길이와 배치 분위기만 참고합니다. 그대로 복제하지 마세요." });
  }

  if (input.photos.length === 0) {
    content.push({ type: "input_text", text: "업로드한 사진이 없습니다. 사진 배치 태그 없이 글 초안만 작성해 주세요." });
  }

  return content;
}

export function createOpenAIProvider(apiKey: string): AIProvider {
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || OPENAI_DEFAULT_MODEL;

  return {
    async generateBlog(input) {
      const response = await withTimeout(
        client.responses.create({
          model,
          instructions: OPENAI_BLOG_PROMPT,
          input: [{ role: "user", content: buildOpenAIContent(input) }],
          store: false,
          temperature: 0.7,
        } as any),
        90000
      );

      const blogContent = response.output_text?.trim() || "# 블로그 초안\n\nAI 초안을 생성하지 못했습니다. 입력 자료를 확인한 뒤 다시 시도해 주세요.";
      const pdfBriefing = input.pdfFile ? "PDF 참고자료를 첨부했습니다. 말투와 구성은 초안 작성에 참고되며, 원문 문장을 그대로 복사하지 않습니다." : "";
      const selectedPhoto = input.photos[input.thumbnailIndex] || input.photos[0] || null;
      const thumbnail = await this.recommendThumbnail({
        provider: input.provider,
        apiKey: input.apiKey,
        apiKeySource: input.apiKeySource,
        selectedPhoto,
        referenceThumbnail: input.referenceThumbnail,
        blogContent,
        userRequest: input.userRequest,
      });

      return {
        blogContent,
        thumbnailData: thumbnail.thumbnailData,
        selectedThumbnailIndex: input.thumbnailIndex,
        pdfBriefing,
        provider: "openai",
        model,
      };
    },

    async recommendThumbnail(input: ThumbnailRecommendationInput) {
      const content: any[] = [{ type: "input_text", text: buildThumbnailUserPrompt(input.blogContent, input.userRequest) }];
      if (input.selectedPhoto) content.push({ type: "input_image", image_url: dataUrl(input.selectedPhoto), detail: "auto" });
      if (input.referenceThumbnail) {
        content.push({ type: "input_image", image_url: dataUrl(input.referenceThumbnail), detail: "auto" });
        content.push({ type: "input_text", text: "참고 썸네일은 문구 길이, 배치, 여백만 참고합니다." });
      }

      const response = await withTimeout(
        client.responses.create({
          model,
          instructions: OPENAI_THUMBNAIL_PROMPT,
          input: [{ role: "user", content }],
          store: false,
          temperature: 0.5,
        } as any),
        45000
      );

      try {
        return { thumbnailData: parseThumbnailJson(response.output_text || ""), provider: "openai", model };
      } catch {
        throw new Error("JSON_PARSE_ERROR");
      }
    },
  };
}
