import express from "express";
import path from "path";
import multer from "multer";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { del } from "@vercel/blob";
import { handleUpload } from "@vercel/blob/client";
import { blobListToUploadFiles, blobToUploadFile } from "./src/server/blobFiles";
import { buildRobotsTxt, buildSitemapXml, normalizeBaseUrl } from "./src/sitemap";
import { generateBlogWithProvider, getFriendlyProviderError, normalizeProvider, recommendThumbnailWithProvider } from "./src/server/ai/provider";

dotenv.config();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

const app = express();
const PORT = parseInt(process.env.PORT || "3222", 10);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

function getBaseUrl(req: express.Request) {
  const envBaseUrl = process.env.BASE_URL || process.env.VITE_BASE_URL;
  if (envBaseUrl?.trim()) return normalizeBaseUrl(envBaseUrl);
  const protocol = req.get("x-forwarded-proto") || req.protocol || "https";
  return `${protocol}://${req.get("host")}`;
}

app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(buildRobotsTxt(getBaseUrl(req)));
});

app.get("/sitemap.xml", (req, res) => {
  res.type("application/xml").send(buildSitemapXml(getBaseUrl(req)));
});

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 서버 환경변수에 설정되어 있지 않습니다.");
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { "User-Agent": "blogdraft" },
    },
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = 60000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TIMEOUT_ERROR: API ?묐떟 ?쒓컙??珥덇낵?섏뿀?듬땲??")), timeoutMs);
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

const GEMINI_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash",
].filter(Boolean) as string[];

function isModelFallbackError(error: any) {
  const message = (error?.message || "").toString();
  const status = (error?.status || "").toString();
  return (
    status === "404" ||
    status === "400" ||
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("not supported") ||
    message.includes("not available") ||
    message.includes("INVALID_ARGUMENT")
  );
}

async function generateContentWithModelFallback(
  ai: GoogleGenAI,
  params: Omit<Parameters<GoogleGenAI["models"]["generateContent"]>[0], "model">,
  timeoutMs: number
) {
  let lastError: any = null;

  for (const model of GEMINI_MODEL_CANDIDATES) {
    try {
      return await withTimeout(
        ai.models.generateContent({
          ...params,
          model,
        }),
        timeoutMs
      );
    } catch (error: any) {
      lastError = error;
      if (!isModelFallbackError(error)) break;
      console.warn(`Gemini model fallback: ${model} failed, trying next model.`);
    }
  }

  throw lastError;
}

function getFriendlyApiError(error: any) {
  const errString = (error?.message || "").toString();
  const statusStr = (error?.status || "").toString();

  if (errString.includes("429") || errString.includes("RESOURCE_EXHAUSTED") || errString.includes("Quota exceeded") || errString.includes("Rate Limit")) {
    return {
      status: 429,
      message: "API 호출 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  if (errString.includes("GEMINI_API_KEY")) {
    return {
      status: 400,
      message: "Gemini API Key가 서버 환경변수에 설정되어 있지 않습니다.",
    };
  }

  if (errString.includes("API key not valid") || errString.includes("API_KEY_INVALID") || errString.includes("PERMISSION_DENIED") || statusStr === "401" || statusStr === "403") {
    return {
      status: 400,
      message: "Gemini API Key가 올바르지 않거나 해당 모델 사용 권한이 없습니다. 서버 환경변수를 확인해 주세요.",
    };
  }

  if (errString.includes("TIMEOUT_ERROR")) {
    return {
      status: 504,
      message: "Gemini API ?묐떟 ?쒓컙??珥덇낵?섏뿀?듬땲?? ?대?吏 ?섎? 以꾩씠嫄곕굹 PDF ?⑸웾????떠 ?ㅼ떆 ?쒕룄??二쇱꽭??",
    };
  }

  if (isModelFallbackError(error)) {
    return {
      status: 400,
      message: "?꾩옱 API Key?먯꽌 ?ъ슜?????덈뒗 Gemini 紐⑤뜽??李얠? 紐삵뻽?듬땲?? ?쒕쾭??GEMINI_MODEL ?ㅼ젙 ?먮뒗 API Key 沅뚰븳???뺤씤??二쇱꽭??",
    };
  }

  return {
    status: 500,
    message: `?쒕쾭 泥섎━ 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?몃? ?ㅻ쪟: ${errString.slice(0, 220) || "?????녿뒗 ?ㅻ쪟"}`,
  };
}

const SYSTEM_PROMPT_A = `
?뱀떊? BlogDraft??釉붾줈洹?珥덉븞 ?몄쭛 ?꾩슦誘몄엯?덈떎.

?듭떖 ?먯튃:
- AI媛 釉붾줈洹몃? ????꾩꽦?섍굅??諛쒗뻾?쒕떎怨?留먰븯吏 ?딆뒿?덈떎.
- ?ъ슜?먭? ?먯떊??寃쏀뿕, ?ъ떎 ?뺤씤, 留먰닾 ?섏젙???뷀븯湲??ъ슫 "?섏젙 媛?ν븳 珥덉븞"???묒꽦?⑸땲??
- "?대┃ ??踰덉쑝濡??꾩꽦", "寃???몄텧 蹂댁옣", "??덉쭏 ?뚰뵾 蹂댁옣" 媛숈? 怨쇱옣 ?쒗쁽? ?덈? ?곗? ?딆뒿?덈떎.
- ?μ냼, 媛寃? ?댁쁺?쒓컙, ?쒗뭹 ?ъ뼇泥섎읆 蹂?????덈뒗 ?뺣낫???⑥젙?섏? 留먭퀬 ?ъ슜?먭? ?뺤씤?섎룄濡??먯뿰?ㅻ읇寃??④퉩?덈떎.
- 李멸퀬 PDF媛 ?덉쑝硫?臾몄옣 ?명씉, 留먰닾, ?⑤씫 援ъ꽦, ?뚯젣紐??뺤떇, ?대え吏 ?ъ슜 諛⑹떇留?李멸퀬?⑸땲?? 湲곗〈 臾몄옣??洹몃?濡?蹂듭궗?섏? ?딆뒿?덈떎.
- 李멸퀬 PDF???ъ슜???붿껌?먯꽌 ?대え吏 ?ъ슜??蹂댁씠硫???珥덉븞?먮룄 鍮꾩듂??鍮덈룄? ?꾩튂濡??먯뿰?ㅻ읇寃?諛섏쁺?⑸땲?? ?대え吏媛 ?꾪? ?녿뒗 ?ㅽ??쇱씠硫?怨쇳븯寃??ｌ? ?딆뒿?덈떎.
- ?대え吏??臾몃떒留덈떎 ?듭?濡?遺숈씠吏 留먭퀬, ?뚯젣紐⑹씠??吏㏃? 媛먯긽 臾몄옣??3~8媛??뺣룄 ?먯뿰?ㅻ읇寃??욎뒿?덈떎.
- ?ъ쭊???덉쑝硫?湲???먮쫫??留욊쾶 ?ъ쭊 諛곗튂 ?쒓렇瑜??ы븿?⑸땲??

?ъ쭊 ?쒓렇 洹쒖튃:
- ?⑥씪 ?ъ쭊: [?ъ쭊 1]
- ?щ윭 ?ъ쭊 鍮꾧탳???뷀뀒?? [?ъ쭊洹몃━?? 1,2,3]
- 怨쇱젙?대굹 ?쒖꽌媛 以묒슂???ъ쭊: [?ъ쭊?щ씪?대뱶: 1,2,3]
- ?낅줈?쒕맂 ?ъ쭊? 媛?ν븳 ??紐⑤몢 ??踰??댁긽 ?먯뿰?ㅻ읇寃?諛곗튂?⑸땲??

異쒕젰 ?뺤떇:
- 留덊겕?ㅼ슫?쇰줈 ?묒꽦?⑸땲??
- ?쒕ぉ, ?꾩엯, 蹂몃Ц ?뚯젣紐? ?ъ쭊 諛곗튂 ?쒓렇, 留덈Т由? "諛쒗뻾 ???닿? ?뷀븯硫?醫뗭? ?댁슜" ?뱀뀡???ы븿?⑸땲??
- 李멸퀬 PDF???대え吏媛 ?덉뿀?ㅻ㈃ ?뚯젣紐⑹씠??吏㏃? 媛뺤“ 臾몄옣??鍮꾩듂??諛⑹떇?쇰줈 ?대え吏瑜??쇰? 諛섏쁺?⑸땲??
- 留덉?留??뱀뀡?먮뒗 ?ㅼ젣 寃쏀뿕, 媛寃??꾩튂/?댁쁺?쒓컙 ?뺤씤, ??留먰닾濡??섏젙??臾몄옣 ?먭????덈궡?⑸땲??
`.trim();

const SYSTEM_PROMPT_B = `
?뱀떊? BlogDraft???몃꽕??臾멸뎄 ?쒖븞 ?꾩슦誘몄엯?덈떎.

?듭떖 ?먯튃:
- ?쇰쪧?곸씤 AI ?몃꽕?쇱쿂??蹂댁씠??怨쇱옣 臾멸뎄瑜??쇳빀?덈떎.
- ?ъ슜?먭? 吏곸젒 留뚮뱺 寃껋쿂???먯뿰?ㅻ읇寃??섏젙?섍린 ?ъ슫 吏㏃? 臾멸뎄瑜??쒖븞?⑸땲??
- 湲 ?댁슜怨?留욎? ?딅뒗 ?싳떆???쒗쁽, 寃???몄텧 蹂댁옣 ?쒗쁽, 怨쇱옣???섏튂 ?쒗쁽? ?곗? ?딆뒿?덈떎.
- ????ъ쭊怨?釉붾줈洹?湲??遺꾩쐞湲곗뿉 ?댁슱由щ뒗 硫붿씤 臾멸뎄, ?쒕툕 臾멸뎄, 諛곗튂 ?꾩튂瑜??쒖븞?⑸땲??

JSON?쇰줈留??묐떟?섏꽭??
`.trim();

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "BlogDraft backend is running" });
});

app.post("/api/blob-upload", async (req, res) => {
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
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
    return res.json(jsonResponse);
  } catch (error: any) {
    return res.status(400).json({ error: "?꾩떆 ?뚯씪 ?낅줈?쒕? 以鍮꾪븯吏 紐삵뻽?듬땲?? ?쒕쾭 吏곸젒 ?꾩넚 諛⑹떇?쇰줈 ?ㅼ떆 ?쒕룄?⑸땲??" });
  }
});

app.post("/api/blob-cleanup", async (req, res) => {
  try {
    const urls = Array.isArray(req.body?.urls) ? req.body.urls.filter(Boolean) : [];
    if (urls.length > 0) await del(urls);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || "?꾩떆 Blob ??젣 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎." });
  }
});

const uploadMiddleware = upload.fields([
  { name: "photos", maxCount: 30 },
  { name: "pdf", maxCount: 1 },
  { name: "referenceThumbnail", maxCount: 1 },
]);

const recommendThumbnailUpload = upload.fields([
  { name: "photo", maxCount: 1 },
  { name: "referenceThumbnail", maxCount: 1 },
]);

async function generateThumbnailData(args: {
  ai: GoogleGenAI;
  selectedPhoto?: Express.Multer.File | null;
  referenceThumbnail?: Express.Multer.File | null;
  blogContent: string;
  userRequest: string;
}) {
  const partsB: any[] = [];

  if (args.selectedPhoto) {
    partsB.push({
      inlineData: {
        mimeType: args.selectedPhoto.mimetype || "image/jpeg",
        data: args.selectedPhoto.buffer.toString("base64"),
      },
    });
    partsB.push({ text: "[????ъ쭊] ?몃꽕??諛곌꼍?쇰줈 ?좏깮???대?吏?낅땲??" });
  }

  if (args.referenceThumbnail) {
    partsB.push({
      inlineData: {
        mimeType: args.referenceThumbnail.mimetype || "image/jpeg",
        data: args.referenceThumbnail.buffer.toString("base64"),
      },
    });
    partsB.push({
      text: "[李멸퀬 ?몃꽕?? ???대?吏??留ㅼ슦 以묒슂???ㅽ???李멸퀬?먮즺?낅땲?? 湲???꾩튂, ?뺣젹 諛⑺뼢, 臾멸뎄 以??? 臾멸뎄 湲몄씠, ?щ갚 ?ш린, 諛곌꼍 ?대몼寃?泥섎━ ?щ?, ?띿뒪??諛뺤뒪/洹몃┝???먮굦, ?꾩껜 遺꾩쐞湲곕? 遺꾩꽍??媛?ν븳 ??鍮꾩듂??援ъ꽦?쇰줈 ?쒖븞?섏꽭?? ?? ?뱀젙 ?대?吏???붿옄?몄쓣 洹몃?濡?蹂듭젣?섏? 留먭퀬 援ъ꽦怨?遺꾩쐞湲곕쭔 李멸퀬?섏꽭??",
    });
  }

  partsB.push({
    text: `
釉붾줈洹?珥덉븞 ?쇰?:
${args.blogContent.slice(0, 1600)}

?ъ슜???붿껌?ы빆:
${args.userRequest || "?놁쓬"}

?꾨옒 ?ㅽ궎留덉뿉 留욎떠 ?먯뿰?ㅻ읇怨??섏젙?섍린 ?ъ슫 ?몃꽕??臾멸뎄瑜??쒖븞?섏꽭??
李멸퀬 ?몃꽕?쇱씠 ?덉쑝硫?臾멸뎄 湲몄씠? 諛곗튂 ?꾩튂瑜?洹?李멸퀬 ?대?吏??理쒕???媛源앷쾶 留욎텛?몄슂.
layout_position? 李멸퀬 ?몃꽕?쇱쓽 ?띿뒪???꾩튂? 媛??媛源뚯슫 媛믪쓣 怨좊Ⅴ?몄슂.
`.trim(),
  });

  const fallback = {
    thumbnail_main_text: "?닿? ?꾩꽦?섎뒗 湲곕줉",
    thumbnail_sub_text: "珥덉븞??寃쏀뿕???뷀빐 ?뺣━",
    layout_position: "CENTER",
  };

  try {
    const thumbResponse = await generateContentWithModelFallback(
      args.ai,
      {
        contents: { parts: partsB },
        config: {
          systemInstruction: SYSTEM_PROMPT_B,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              thumbnail_main_text: { type: Type.STRING, description: "15???덊뙉??硫붿씤 臾멸뎄" },
              thumbnail_sub_text: { type: Type.STRING, description: "20???덊뙉???쒕툕 臾멸뎄" },
              layout_position: { type: Type.STRING, description: "CENTER, BOTTOM_LEFT, TOP_BANNER 以??섎굹" },
            },
            required: ["thumbnail_main_text", "thumbnail_sub_text", "layout_position"],
          },
        },
      },
      30000
    );

    if (!thumbResponse.text) return fallback;
    const parsed = JSON.parse(thumbResponse.text.trim());
    return {
      thumbnail_main_text: parsed.thumbnail_main_text || fallback.thumbnail_main_text,
      thumbnail_sub_text: parsed.thumbnail_sub_text || fallback.thumbnail_sub_text,
      layout_position: ["CENTER", "BOTTOM_LEFT", "TOP_BANNER"].includes(parsed.layout_position) ? parsed.layout_position : "CENTER",
    };
  } catch (error) {
    console.error("Thumbnail generation warning:", error);
    return fallback;
  }
}

async function generatePdfBriefing(ai: GoogleGenAI, pdfFile: Express.Multer.File | null) {
  if (!pdfFile) return "";

  try {
    const response = await generateContentWithModelFallback(
      ai,
      {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: pdfFile.buffer.toString("base64"),
              },
            },
            {
              text: `
泥⑤???PDF瑜?BlogDraft 李멸퀬?먮즺 愿?먯뿉??4以??대궡濡?釉뚮━?묓븯?몄슂.
- 臾몄옣 ?명씉怨?留먰닾
- ?⑤씫/?뚯젣紐?援ъ꽦
- ?대え吏???뱀닔臾몄옄 ?ъ슜 諛⑹떇
- ??珥덉븞??李멸퀬????湲곗〈 臾몄옣??洹몃?濡??몄슜?섍굅??蹂듭궗?섏? 留먭퀬, ?ㅽ???遺꾩꽍留??붿빟?섏꽭??
`.trim(),
            },
          ],
        },
        config: {
          systemInstruction: "?뱀떊? 釉붾줈洹?湲 ?ㅽ??쇱쓣 媛꾨떒??遺꾩꽍???ъ슜?먯뿉寃??ㅻ챸?섎뒗 ?몄쭛 ?꾩슦誘몄엯?덈떎.",
          temperature: 0.2,
        },
      },
      30000
    );

    return response.text?.trim() || "";
  } catch (error) {
    console.error("PDF briefing warning:", error);
    return "PDF 李멸퀬?먮즺瑜?泥⑤??덉뒿?덈떎. 臾몄옣 ?명씉, 留먰닾, ?⑤씫 援ъ꽦怨??쒗쁽 諛⑹떇? 珥덉븞 ?앹꽦??李멸퀬?⑸땲??";
  }
}

app.post("/api/generate", (req, res) => {
  if (req.is("application/json")) {
    (async () => {
      const provider = normalizeProvider(req.body.aiProvider);
      try {
        const photos = Array.isArray(req.body.photos) ? await blobListToUploadFiles(req.body.photos) : [];
        const pdfFile = req.body.pdf ? await blobToUploadFile(req.body.pdf) : null;
        const referenceThumbnail = req.body.referenceThumbnail ? await blobToUploadFile(req.body.referenceThumbnail) : null;
        const result = await generateBlogWithProvider({
          provider,
          photos: photos as any,
          pdfFile: pdfFile as any,
          referenceThumbnail: referenceThumbnail as any,
          tone: (req.body.tone as string) || "친근한 조언말",
          styleLevel: (req.body.styleLevel as string) || "3",
          userRequest: (req.body.userRequest as string) || "",
          thumbnailIndex: parseInt((req.body.thumbnailIndex as string) || "0", 10),
        });
        return res.json({ success: true, ...result });
      } catch (error: any) {
        const friendly = getFriendlyProviderError(error, provider);
        return res.status(friendly.status).json({ success: false, error: friendly.message });
      }
    })();
    return;
  }

  uploadMiddleware(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr instanceof multer.MulterError && uploadErr.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          error: "?낅줈?쒗븳 ?ъ쭊 ?먮뒗 PDF ?⑸웾???덈Т ?쎈땲?? ?뚯씪 ?섎굹 ?⑸웾??以꾩씤 ???ㅼ떆 ?쒕룄??二쇱꽭??",
        });
      }

      return res.status(400).json({
        success: false,
        error: `?뚯씪 ?낅줈??泥섎━ 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎: ${uploadErr.message}`,
      });
    }

    try {
      const provider = normalizeProvider(req.body.aiProvider);
      const providerFiles = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const providerPhotos = Array.isArray(req.body.photos) ? await blobListToUploadFiles(req.body.photos) : providerFiles?.photos || [];
      const providerPdfFile = req.body.pdf ? await blobToUploadFile(req.body.pdf) : providerFiles?.pdf?.[0] || null;
      const providerReferenceThumbnail = req.body.referenceThumbnail ? await blobToUploadFile(req.body.referenceThumbnail) : providerFiles?.referenceThumbnail?.[0] || null;
      const result = await generateBlogWithProvider({
        provider,
        photos: providerPhotos as any,
        pdfFile: providerPdfFile as any,
        referenceThumbnail: providerReferenceThumbnail as any,
        tone: (req.body.tone as string) || "친근한 조언말",
        styleLevel: (req.body.styleLevel as string) || "3",
        userRequest: (req.body.userRequest as string) || "",
        thumbnailIndex: parseInt((req.body.thumbnailIndex as string) || "0", 10),
      });
      return res.json({ success: true, ...result });

      const ai = getAIClient();

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const photos = Array.isArray(req.body.photos) ? await blobListToUploadFiles(req.body.photos) : files?.photos || [];
      const pdfFile = req.body.pdf ? await blobToUploadFile(req.body.pdf) : files?.pdf?.[0] || null;
      const referenceThumbnail = req.body.referenceThumbnail ? await blobToUploadFile(req.body.referenceThumbnail) : files?.referenceThumbnail?.[0] || null;
      const tone = (req.body.tone as string) || "친근한 조언말";
      const styleLevel = (req.body.styleLevel as string) || "3";
      const userRequest = (req.body.userRequest as string) || "";
      const thumbnailIndex = parseInt((req.body.thumbnailIndex as string) || "0", 10);

      const partsA: any[] = [];

      if (pdfFile) {
        partsA.push({
          inlineData: {
            mimeType: "application/pdf",
            data: pdfFile.buffer.toString("base64"),
          },
        });
        partsA.push({
          text: `[??湲 ?ㅽ???李멸퀬?먮즺] ${pdfFile.originalname} ?뚯씪??泥⑤??섏뿀?듬땲?? 湲곗〈 臾몄옣??蹂듭궗?섏? 留먭퀬 臾몄옣 ?명씉, 留먰닾, ?⑤씫 援ъ꽦, ?뚯젣紐?諛⑹떇留?李멸퀬?섏꽭??`,
        });
      } else {
        partsA.push({
          text: "[??湲 ?ㅽ???李멸퀬?먮즺] 泥⑤???PDF媛 ?놁뒿?덈떎. ?좏깮??湲곕낯 留먰닾? ?ъ슜???붿껌?ы빆??湲곗??쇰줈 珥덉븞???묒꽦?섏꽭??",
        });
      }

      if (photos.length > 0) {
        photos.forEach((photo, idx) => {
          partsA.push({
            inlineData: {
              mimeType: photo.mimetype || "image/jpeg",
              data: photo.buffer.toString("base64"),
            },
          });
          partsA.push({ text: `[?ъ쭊 ${idx + 1}] ${photo.originalname || `?ъ쭊 ${idx + 1}`}` });
        });
      } else {
        partsA.push({ text: "[?ъ쭊] ?낅줈?쒕맂 ?ъ쭊???놁뒿?덈떎. ?ъ쭊 諛곗튂 ?쒓렇 ?놁씠 湲 珥덉븞留??묒꽦?섏꽭??" });
      }

      partsA.push({
        text: `
?낅젰 議곌굔:
- ?낅줈???ъ쭊 ?? ${photos.length}
- 湲곕낯 留먰닾: ${tone}
- ?쒗쁽 媛뺣룄: ${styleLevel}/5
- ?ъ슜??異붽? ?붿껌?ы빆: ${userRequest || "?놁쓬"}

紐⑺몴:
?ъ쭊怨?湲곗〈 湲??諛뷀깢?쇰줈 ??留먰닾??媛源뚯슫 釉붾줈洹?珥덉븞??留뚮뱾怨? ?ъ슜?먭? 寃쏀뿕怨??ъ떎 ?뺤씤???뷀빐 ?꾩꽦?????덇쾶 ?묒꽦?섏꽭??
`.trim(),
      });

      partsA.push({
        text: [
          "?ъ쭊 諛곗튂 洹쒖튃:",
          "- ?낅줈???쒖꽌? ?ъ쭊 踰덊샇瑜??좎??섍퀬 紐⑤뱺 ?ъ쭊??理쒖냼 1???ы븿?⑸땲??",
          "- 鍮꾩듂???ъ쭊? 2~4?μ뵫 洹몃━?쒕줈 臾띠뒿?덈떎.",
          "- 怨쇱젙???ъ쭊? ?щ씪?대뱶濡?臾띠뒿?덈떎.",
          "- ?⑥씪 ?ъ쭊 ?쒓렇瑜?怨쇰룄?섍쾶 諛섎났?섏? ?딆뒿?덈떎.",
        ].join("\n"),
      });

      const blogResponse = await generateContentWithModelFallback(
        ai,
        {
          contents: { parts: partsA },
          config: {
            systemInstruction: SYSTEM_PROMPT_A,
            temperature: 0.7,
          },
        },
        60000
      );

      const blogContent = blogResponse.text || "# 釉붾줈洹?珥덉븞\n\n珥덉븞???앹꽦?섏? 紐삵뻽?듬땲?? ?낅젰 ?먮즺瑜?以꾩뿬 ?ㅼ떆 ?쒕룄??二쇱꽭??";
      const pdfBriefing = await generatePdfBriefing(ai, pdfFile as any);

      const selectedPhoto = photos[thumbnailIndex] || photos[0] || null;
      const thumbnailData = await generateThumbnailData({
        ai,
        selectedPhoto: selectedPhoto as any,
        referenceThumbnail: referenceThumbnail as any,
        blogContent,
        userRequest,
      });

      return res.json({
        success: true,
        blogContent,
        thumbnailData,
        pdfBriefing,
        selectedThumbnailIndex: thumbnailIndex,
      });
    } catch (error: any) {
      console.error("Error generating content:", error?.message || error);

      const friendly = getFriendlyProviderError(error, normalizeProvider(req.body.aiProvider));
      return res.status(friendly.status).json({
        success: false,
        error: friendly.message,
      });
    }
  });
});

app.post("/api/recommend-thumbnail", (req, res) => {
  if (req.is("application/json")) {
    (async () => {
      const provider = normalizeProvider(req.body.aiProvider);
      try {
        const selectedPhoto = req.body.photo ? await blobToUploadFile(req.body.photo) : null;
        const referenceThumbnail = req.body.referenceThumbnail ? await blobToUploadFile(req.body.referenceThumbnail) : null;
        const result = await recommendThumbnailWithProvider({
          provider,
          selectedPhoto: selectedPhoto as any,
          referenceThumbnail: referenceThumbnail as any,
          blogContent: (req.body.blogContent as string) || "",
          userRequest: (req.body.userRequest as string) || "",
        });
        return res.json({ success: true, ...result });
      } catch (error: any) {
        const friendly = getFriendlyProviderError(error, provider);
        return res.status(friendly.status).json({ success: false, error: friendly.message });
      }
    })();
    return;
  }

  recommendThumbnailUpload(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({
        success: false,
        error: `?뚯씪 ?낅줈??泥섎━ 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎: ${uploadErr.message}`,
      });
    }

    try {
      const provider = normalizeProvider(req.body.aiProvider);
      const providerFiles = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const providerSelectedPhoto = req.body.photo ? await blobToUploadFile(req.body.photo) : providerFiles?.photo?.[0] || null;
      const providerReferenceThumbnail = req.body.referenceThumbnail ? await blobToUploadFile(req.body.referenceThumbnail) : providerFiles?.referenceThumbnail?.[0] || null;
      const result = await recommendThumbnailWithProvider({
        provider,
        selectedPhoto: providerSelectedPhoto as any,
        referenceThumbnail: providerReferenceThumbnail as any,
        blogContent: (req.body.blogContent as string) || "",
        userRequest: (req.body.userRequest as string) || "",
      });
      return res.json({ success: true, ...result });

      const ai = getAIClient();
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const selectedPhoto = req.body.photo ? await blobToUploadFile(req.body.photo) : files?.photo?.[0] || null;
      const referenceThumbnail = req.body.referenceThumbnail ? await blobToUploadFile(req.body.referenceThumbnail) : files?.referenceThumbnail?.[0] || null;
      const blogContent = (req.body.blogContent as string) || "";
      const userRequest = (req.body.userRequest as string) || "";

      const thumbnailData = await generateThumbnailData({
        ai,
        selectedPhoto: selectedPhoto as any,
        referenceThumbnail: referenceThumbnail as any,
        blogContent,
        userRequest,
      });

      return res.json({ success: true, thumbnailData });
    } catch (error: any) {
      console.error("Error recommending thumbnail:", error?.message || error);
      const friendly = getFriendlyProviderError(error, normalizeProvider(req.body.aiProvider));
      return res.status(friendly.status).json({
        success: false,
        error: friendly.message,
      });
    }
  });
});

app.use("/api", (_req, res) => {
  res.status(404).json({ success: false, error: "?붿껌??API 寃쎈줈瑜?李얠쓣 ???놁뒿?덈떎." });
});

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled server error:", err?.message || err);
  if (req.path.startsWith("/api") && !res.headersSent) {
    return res.status(500).json({
      success: false,
      error: "?쒕쾭?먯꽌 ?덇린移??딆? ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.",
    });
  }
  res.status(500).send("Internal Server Error");
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.info(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
