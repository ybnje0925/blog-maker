import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation, useParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  ImageIcon,
  LayoutList,
  PenLine,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Header } from "./components/Header";
import { InputForm } from "./components/InputForm";
import { BlogPreview } from "./components/BlogPreview";
import { ThumbnailPreview } from "./components/ThumbnailPreview";
import { GuideArticleData, GuideArticleLayout } from "./components/GuideLayout";
import { absoluteUrl, getClientBaseUrl, SEO, StructuredData } from "./components/SEO";
import { ContactInfoBox, InfoBox, PolicyLayout, PolicySection, policyLinks } from "./components/PolicyLayout";
import { FooterAdSlot } from "./components/ads/FooterAdSlot";
import { BlobFileMetadata, FormState, ThumbnailData } from "./types";
import { deleteBlobFiles, uploadFileToBlob } from "./blobUpload";
import {
  formatBytes,
  MAX_OPTIMIZED_PHOTOS_BYTES,
  MAX_ORIGINAL_SELECTION_BYTES,
  MAX_PDF_BYTES,
  MAX_PHOTO_COUNT,
  MAX_REFERENCE_THUMBNAIL_BYTES,
} from "./uploadLimits";
import beforePublishingGuide from "../content/guides/before-publishing-ai-draft.mdx?raw";
import addPersonalExperienceGuide from "../content/guides/add-personal-experience.mdx?raw";
import keepMyToneGuide from "../content/guides/keep-my-tone.mdx?raw";
import aiLikeSentencesGuide from "../content/guides/ai-like-sentences.mdx?raw";
import manyPhotosFlowGuide from "../content/guides/many-photos-flow.mdx?raw";
import goodTitleVsClickbaitGuide from "../content/guides/good-title-vs-clickbait.mdx?raw";
import shortThumbnailCopyGuide from "../content/guides/short-thumbnail-copy.mdx?raw";
import avoidAdLikeThumbnailGuide from "../content/guides/avoid-ad-like-thumbnail.mdx?raw";
import howFarUseAiToolGuide from "../content/guides/how-far-use-ai-tool.mdx?raw";
import finalChecklistGuide from "../content/guides/final-checklist.mdx?raw";
import restaurantReviewMustAddGuide from "../content/guides/restaurant-review-must-add.mdx?raw";
import productReviewHumanJudgmentGuide from "../content/guides/product-review-human-judgment.mdx?raw";

const DRAFT_STORAGE_KEY = "blogdraft_local_draft_v2";
const SERVER_SAFE_TOTAL_BYTES = MAX_ORIGINAL_SELECTION_BYTES;
const formatUploadBytes = formatBytes;
const SITE_NAME = "BlogDraft";

function readStorageJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

const pageSeo = {
  home: {
    title: "BlogDraft | AI 釉붾줈洹?珥덉븞怨??몃꽕???묒꽦 ?꾧뎄",
    description: "?ъ쭊怨?李멸퀬?먮즺瑜?諛뷀깢?쇰줈 釉붾줈洹?珥덉븞??留뚮뱾怨? ??留먰닾? 寃쏀뿕???뷀빐 ?몃꽕?쇨퉴吏 ?ㅻ벉??BlogDraft ?꾧뎄?낅땲??",
  },
  guide: {
    title: "釉붾줈洹??묒꽦 媛?대뱶 | BlogDraft",
    description: "AI 珥덉븞????寃쏀뿕怨?留먰닾濡??ㅻ벉怨? ?ъ쭊怨??몃꽕?쇨퉴吏 ?먯뿰?ㅻ읇寃??꾩꽦?섎뒗 釉붾줈洹??묒꽦 媛?대뱶?낅땲??",
  },
  about: {
    title: "?쒕퉬???뚭컻 | BlogDraft",
    description: "BlogDraft媛 ?ъ쭊, 李멸퀬?먮즺, 留먰닾 遺꾩꽍??諛뷀깢?쇰줈 ?섏젙 媛?ν븳 釉붾줈洹?珥덉븞怨??몃꽕???몄쭛???뺣뒗 諛⑹떇???뚭컻?⑸땲??",
  },
  privacy: {
    title: "媛쒖씤?뺣낫泥섎━諛⑹묠 | BlogDraft",
    description: "BlogDraft ?댁슜 怨쇱젙?먯꽌 泥섎━?????덈뒗 ?낅젰 ?먮즺, ?낅줈???뚯씪, 媛쒖씤 API Key? 釉뚮씪?곗? ????곗씠??泥섎━ 湲곗????덈궡?⑸땲??",
  },
  terms: {
    title: "?댁슜?쎄? | BlogDraft",
    description: "BlogDraft ?쒕퉬???댁슜 議곌굔, AI 寃곌낵臾쇱쓽 ?깃꺽, 湲덉??됱쐞? ?ъ슜?먯쓽 理쒖쥌 諛쒗뻾 梨낆엫???덈궡?⑸땲??",
  },
  contact: {
    title: "臾몄쓽?섍린 | BlogDraft",
    description: "BlogDraft ?쒕퉬???ㅻ쪟, 媛쒖씤?뺣낫, ??묎텒 移⑦빐 ?좉퀬, ?쒗쑕? 湲곕뒫 媛쒖꽑 ?쒖븞??臾몄쓽?섎뒗 諛⑸쾿???덈궡?⑸땲??",
  },
  copyright: {
    title: "肄섑뀗痢?諛???묎텒 ?덈궡 | BlogDraft",
    description: "BlogDraft?먯꽌 ?ъ쭊, PDF, 湲怨?AI 寃곌낵臾쇱쓣 ?ъ슜?????뺤씤?댁빞 ????묎텒, 珥덉긽沅? 媛쒖씤?뺣낫 湲곗????덈궡?⑸땲??",
  },
  aiPolicy: {
    title: "AI ?앹꽦 寃곌낵 ?댁슜 ?덈궡 | BlogDraft",
    description: "AI??珥덉븞??留뚮뱾怨?留덉?留??꾩꽦? ?ъ슜?먭? ?쒕떎??BlogDraft??AI 寃곌낵臾??댁슜 ?먯튃怨??몄쭛 湲곗????덈궡?⑸땲??",
  },
  notFound: {
    title: "?섏씠吏瑜?李얠쓣 ???놁뒿?덈떎 | BlogDraft",
    description: "?붿껌??BlogDraft ?섏씠吏瑜?李얠쓣 ???놁뒿?덈떎. ???먮뒗 媛?대뱶 紐⑸줉?먯꽌 ?꾩슂???섏씠吏瑜??ㅼ떆 李얠븘蹂댁꽭??",
  },
};

function organizationJsonLd(baseUrl = getClientBaseUrl()): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/", baseUrl),
    logo: absoluteUrl("/favicon.svg", baseUrl),
  };
}

function websiteJsonLd(baseUrl = getClientBaseUrl()): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/", baseUrl),
    description: pageSeo.home.description,
  };
}

function webPageJsonLd(type: string, name: string, description: string, path: string, baseUrl = getClientBaseUrl()): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": type,
    name,
    description,
    url: absoluteUrl(path, baseUrl),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/", baseUrl),
    },
  };
}

function articleJsonLd(article: GuideArticleData, path: string, baseUrl = getClientBaseUrl()): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.summary,
    articleSection: article.category,
    url: absoluteUrl(path, baseUrl),
    image: absoluteUrl("/og-default.svg", baseUrl),
    datePublished: article.publishedAt.includes("?낅젰 ?꾩슂") ? undefined : article.publishedAt,
    dateModified: article.updatedAt.includes("?낅젰 ?꾩슂") ? undefined : article.updatedAt,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/favicon.svg", baseUrl),
      },
    },
  };
}

function breadcrumbJsonLd(article: GuideArticleData, path: string, baseUrl = getClientBaseUrl()): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/", baseUrl) },
      { "@type": "ListItem", position: 2, name: "Guide", item: absoluteUrl("/guide", baseUrl) },
      { "@type": "ListItem", position: 3, name: article.title, item: absoluteUrl(path, baseUrl) },
    ],
  };
}

function getUploadBytes(state: FormState) {
  return (
    state.photos.reduce((sum, photo) => sum + photo.file.size, 0) +
    (state.pdfFile?.size || 0) +
    (state.referenceThumbnailFile?.size || 0)
  );
}

const initialFormState: FormState = {
  photos: [],
  pdfFile: null,
  pdfFileName: null,
  referenceThumbnailFile: null,
  referenceThumbnailFileName: null,
  referenceThumbnailPreviewUrl: null,
  tone: "친근한 조언말",
  styleLevel: 3,
  userRequest: "",
  thumbnailIndex: 0,
  aiProvider: "gemini",
  privacyConsent: false,
};

const initialThumbnailData: ThumbnailData = {
  thumbnail_main_text: "?ㅻ뒛??湲곕줉",
  thumbnail_sub_text: "??寃쏀뿕???뷀빐 ?꾩꽦?섎뒗 湲",
  layout_position: "CENTER",
};

let sessionFormState: FormState = initialFormState;
let sessionBlogContent = "";
let sessionThumbnailData: ThumbnailData = initialThumbnailData;
let sessionPdfBriefing = "";
let sessionActiveTab: "blog" | "thumbnail" = "blog";

const featureCards = [
  {
    icon: PenLine,
    title: "??留먰닾瑜?李멸퀬??湲 ?묒꽦",
    body: "湲곗〈 釉붾줈洹?湲?대굹 李멸퀬 PDF??臾몄옣 湲몄씠, 留먰닾, ?⑤씫 援ъ꽦怨??쒗쁽 諛⑹떇??李멸퀬?⑸땲??",
  },
  {
    icon: LayoutList,
    title: "?ъ쭊??留욌뒗 ?먯뿰?ㅻ윭??湲 援ъ꽦",
    body: "?낅줈?쒗븳 ?ъ쭊??遺꾩꽍??湲???먮쫫???댁슱由щ뒗 ?꾩튂? ?쒖꽌瑜??쒖븞?⑸땲??",
  },
  {
    icon: ImageIcon,
    title: "내가 만든 느낌의 썸네일",
    body: "????ъ쭊怨?湲??遺꾩쐞湲곕? 諛뷀깢?쇰줈 ?몃꽕??臾멸뎄? 援ъ꽦???④퍡 ?쒖븞?⑸땲??",
  },
  {
    icon: CheckCircle2,
    title: "발행 전 직접 수정 가능",
    body: "?꾩꽦蹂몄씠 ?꾨땲???섏젙?섍린 ?ъ슫 珥덉븞?쇰줈 ?쒓났???ъ슜?먭? 吏곸젒 ?ㅻ벉?????덉뒿?덈떎.",
  },
];

function HomePage() {
  const [formState, setFormState] = useState<FormState>(sessionFormState);
  const [activeTab, setActiveTab] = useState<"blog" | "thumbnail">(sessionActiveTab);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blogContent, setBlogContent] = useState(sessionBlogContent);
  const [thumbnailData, setThumbnailData] = useState<ThumbnailData>(sessionThumbnailData);
  const [pdfBriefing, setPdfBriefing] = useState(sessionPdfBriefing);
  const [todayUsedCount, setTodayUsedCount] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const getTodayKey = () => {
    const d = new Date();
    return `blogdraft_daily_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
  };

  useEffect(() => {
    try {
      const parsed = readStorageJson<Partial<FormState>>(DRAFT_STORAGE_KEY);
      if (parsed) {
        setFormState((prev) => ({
          ...prev,
          tone: parsed.tone || prev.tone,
          styleLevel: parsed.styleLevel || prev.styleLevel,
          aiProvider: "gemini",
          privacyConsent: Boolean(parsed.privacyConsent),
        }));
      }

      const used = localStorage.getItem(getTodayKey());
      setTodayUsedCount(used ? parseInt(used, 10) || 0 : 0);
    } catch {
      setErrorMessage("??λ맂 ?꾩떆 ?곗씠???쇰?瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲?? ?낅젰 ?댁슜???뺤씤?????ㅼ떆 ?쒕룄??二쇱꽭??");
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          tone: formState.tone,
          styleLevel: formState.styleLevel,
          aiProvider: "gemini",
          privacyConsent: formState.privacyConsent,
        })
      );
    } catch {
      setErrorMessage("?꾩떆 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎. 釉뚮씪?곗? ???怨듦컙???뺤씤??二쇱꽭??");
    }
  }, [
    formState.tone,
    formState.styleLevel,
    formState.privacyConsent,
  ]);

  useEffect(() => {
    try {
      localStorage.removeItem("blogdraft_generation_result_v2");
    } catch {
      setErrorMessage("?앹꽦 寃곌낵 ?꾩떆 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎. 釉뚮씪?곗? ???怨듦컙???뺤씤??二쇱꽭??");
    }
  }, [blogContent, thumbnailData, pdfBriefing]);

  useEffect(() => {
    sessionFormState = formState;
  }, [formState]);

  useEffect(() => {
    sessionBlogContent = blogContent;
  }, [blogContent]);

  useEffect(() => {
    sessionThumbnailData = thumbnailData;
  }, [thumbnailData]);

  useEffect(() => {
    sessionPdfBriefing = pdfBriefing;
  }, [pdfBriefing]);

  useEffect(() => {
    sessionActiveTab = activeTab;
  }, [activeTab]);

  const hasCustomKey = false;
  const usesRemaining = Math.max(0, 3 - todayUsedCount);
  const selectedPhoto = formState.photos[formState.thumbnailIndex] || formState.photos[0] || null;

  const handleReset = () => {
    if (!confirm("?낅젰 ?댁슜怨??앹꽦 寃곌낵瑜?珥덇린?뷀븷源뚯슂? ?낅줈?쒗븳 ?ъ쭊? ?ㅼ떆 ?좏깮?댁빞 ?⑸땲??")) return;
    setFormState(initialFormState);
    setBlogContent("");
    setThumbnailData(initialThumbnailData);
    setPdfBriefing("");
    setErrorMessage(null);
    sessionFormState = initialFormState;
    sessionBlogContent = "";
    sessionThumbnailData = initialThumbnailData;
    sessionPdfBriefing = "";
    sessionActiveTab = "blog";
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    localStorage.removeItem("blogdraft_generation_result_v2");
    localStorage.removeItem("blogdraft_openai_api_key_v1");
    localStorage.removeItem("blogdraft_gemini_api_key_v1");
  };

  const handleSubmit = () => {
    if (isGenerating) return;

    if (!formState.privacyConsent) {
      setErrorMessage("AI 珥덉븞 ?앹꽦???꾪빐 ?낅젰 ?먮즺 泥섎━ ?덈궡???숈쓽??二쇱꽭??");
      return;
    }

    if (usesRemaining <= 0) {
      setErrorMessage("오늘 제공되는 무료 생성 3회를 모두 사용했습니다. 날짜가 바뀌면 무료 생성 횟수가 다시 제공됩니다.");
      return;
    }

    if (formState.photos.length === 0 && !confirm("?ъ쭊 ?놁씠 湲 珥덉븞留??앹꽦?좉퉴?? ?ъ쭊??異붽??섎㈃ 湲 ?먮쫫怨??몃꽕???쒖븞?????먯뿰?ㅻ윭?뚯쭛?덈떎.")) {
      return;
    }

    performGenerate();
  };

  const performGenerate = async () => {
    if (isGenerating) return;
    const temporaryBlobs: BlobFileMetadata[] = [];
    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setUploadProgress("업로드 준비 중");

      const uploadBytes = getUploadBytes(formState);
      if (uploadBytes > SERVER_SAFE_TOTAL_BYTES) {
        throw new Error(`?쒕쾭 ?낅줈???쒗븳???섏뿀?듬땲?? ?꾩옱 ${formatUploadBytes(uploadBytes)}?대ŉ, ${formatUploadBytes(SERVER_SAFE_TOTAL_BYTES)} ?댄븯濡?以꾩뿬 二쇱꽭??`);
      }
      const filesToUpload = [
        ...formState.photos.map((photo, index) => ({ kind: "photo", file: photo.file, order: index })),
        ...(formState.pdfFile ? [{ kind: "pdf", file: formState.pdfFile, order: 0 }] : []),
        ...(formState.referenceThumbnailFile ? [{ kind: "reference-thumbnail", file: formState.referenceThumbnailFile, order: 0 }] : []),
      ];
      const photoBlobs: BlobFileMetadata[] = [];
      let pdfBlob: BlobFileMetadata | null = null;
      let referenceThumbnailBlob: BlobFileMetadata | null = null;

      for (let index = 0; index < filesToUpload.length; index += 1) {
        const item = filesToUpload[index];
        const blob = await uploadFileToBlob(item.kind, item.file, item.order, filesToUpload.length, (progress) => {
          setUploadProgress(`?꾩떆 ?뚯씪 ?낅줈??${index + 1}/${filesToUpload.length}: ${progress.percentage}%`);
        });
        temporaryBlobs.push(blob);
        if (item.kind === "photo") photoBlobs.push({ ...blob, order: item.order });
        if (item.kind === "pdf") pdfBlob = blob;
        if (item.kind === "reference-thumbnail") referenceThumbnailBlob = blob;
      }

      setUploadProgress("Gemini Flash로 생성 요청 중");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: photoBlobs,
          pdf: pdfBlob,
          referenceThumbnail: referenceThumbnailBlob,
          tone: formState.tone,
          styleLevel: formState.styleLevel.toString(),
          userRequest: formState.userRequest,
          thumbnailIndex: formState.thumbnailIndex.toString(),
          aiProvider: "gemini",
        }),
      });
      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        if (res.status === 413) {
          throw new Error("?낅줈???⑸웾???쒕쾭 ?붿껌 ?쒗븳???섏뿀?듬땲?? ?ъ쭊 ?섎? 以꾩씠嫄곕굹 PDF瑜????묒? ?뚯씪濡??щ젮 二쇱꽭??");
        }
        throw new Error(`?쒕쾭媛 JSON ?묐떟??諛섑솚?섏? ?딆븯?듬땲?? HTTP ${res.status}`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "釉붾줈洹?珥덉븞 ?앹꽦 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.");
      }

      setBlogContent(data.blogContent || "");
      setThumbnailData(data.thumbnailData || initialThumbnailData);
      setPdfBriefing(data.pdfBriefing || "");
      const nextCount = todayUsedCount + 1;
      setTodayUsedCount(nextCount);
      localStorage.setItem(getTodayKey(), nextCount.toString());
      setActiveTab("blog");
    } catch (err: any) {
      setErrorMessage(err?.message || "?쒕쾭 ?듭떊 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.");
    } finally {
      await deleteBlobFiles(temporaryBlobs);
      setUploadProgress(null);
      setIsGenerating(false);
    }
  };

  const handleRecommendThumbnail = async () => {
    if (isGenerating) return;

    const temporaryBlobs: BlobFileMetadata[] = [];
    try {
      setErrorMessage(null);
      const photo = selectedPhoto ? await uploadFileToBlob("thumbnail-photo", selectedPhoto.file, 0, 2) : null;
      if (photo) temporaryBlobs.push(photo);
      const referenceThumbnail = formState.referenceThumbnailFile ? await uploadFileToBlob("reference-thumbnail", formState.referenceThumbnailFile, 1, 2) : null;
      if (referenceThumbnail) temporaryBlobs.push(referenceThumbnail);

      const res = await fetch("/api/recommend-thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo,
          referenceThumbnail,
          blogContent,
          userRequest: formState.userRequest,
          aiProvider: "gemini",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "?몃꽕??臾멸뎄 ?ъ텛泥?以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.");
      }
      setThumbnailData(data.thumbnailData || initialThumbnailData);
    } catch (err: any) {
      setErrorMessage(err?.message || "?몃꽕??臾멸뎄 ?ъ텛泥?以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??");
    } finally {
      await deleteBlobFiles(temporaryBlobs);
    }
  };

  return (
    <>
      <SEO
        title={pageSeo.home.title}
        description={pageSeo.home.description}
        path="/"
        structuredData={[organizationJsonLd(), websiteJsonLd()]}
      />
      <Header onReset={handleReset} isGenerating={isGenerating} hasCustomKey={hasCustomKey} usesRemaining={usesRemaining} />
      <main className="flex-1">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
            <div className="space-y-6">
              <div className="max-w-3xl space-y-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">BlogDraft</p>
                <h1 className="text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
                  湲? ??留먰닾泥섎읆, ?몃꽕?쇱? ?닿? 留뚮뱺 寃껋쿂??                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600">
                  ?ъ쭊怨?湲곗〈 湲??李멸퀬??釉붾줈洹?珥덉븞??留뚮뱾怨? ??痍⑦뼢??留욌뒗 ?몃꽕?쇨퉴吏 ?④퍡 ?꾩꽦??蹂댁꽭??
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {featureCards.map(({ icon: Icon, title, body }) => (
                  <article key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <Icon className="mb-3 h-5 w-5 text-blue-700" />
                    <h2 className="text-sm font-bold text-slate-950">{title}</h2>
                    <p className="mt-2 text-xs leading-5 text-slate-600">{body}</p>
                  </article>
                ))}
              </div>
            </div>

            <aside className="rounded-lg border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <Wand2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <div>
                  <h2 className="text-sm font-black text-slate-950">AI??珥덉븞??留뚮뱾怨? 留덉?留??꾩꽦? ?ъ슜?먭? ?⑸땲??</h2>
                  <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-700">
                    <li>AI媛 ?묒꽦??湲??洹몃?濡?諛쒗뻾?섍린蹂대떎 ?ㅼ젣 寃쏀뿕怨??뺣낫瑜?異붽???二쇱꽭??</li>
                    <li>?μ냼, 媛寃? ?쒗뭹 ?뺣낫泥섎읆 蹂?????덈뒗 ?댁슜? 諛쒗뻾 ?꾩뿉 ?ㅼ떆 ?뺤씤??二쇱꽭??</li>
                    <li>?쇰쪧?곸씤 AI 臾몄옣蹂대떎 ?먯떊??寃쏀뿕怨?留먰닾瑜?諛섏쁺??湲?????먯뿰?ㅻ읇寃??꾨떖?????덉뒿?덈떎.</li>
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-12 lg:p-8">
          {errorMessage && (
            <div className="lg:col-span-12 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <strong className="block font-bold">?덈궡 硫붿떆吏</strong>
                  <span>{errorMessage}</span>
                </div>
                <button type="button" onClick={() => setErrorMessage(null)} className="text-xs font-bold text-red-500 hover:text-red-700">
                  ?リ린
                </button>
              </div>
            </div>
          )}

          {uploadProgress && (
            <div className="lg:col-span-12 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700">
              {uploadProgress}
            </div>
          )}

          <div className="lg:col-span-5">
            <InputForm
              formState={formState}
              setFormState={setFormState}
              onSubmit={handleSubmit}
              isGenerating={isGenerating}
              pdfBriefing={pdfBriefing}
              usesRemaining={usesRemaining}
            />
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setActiveTab("blog")} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${activeTab === "blog" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    <FileText className="h-4 w-4" />
                    釉붾줈洹?湲 誘몃━蹂닿린
                  </button>
                  <button type="button" onClick={() => setActiveTab("thumbnail")} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${activeTab === "thumbnail" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    <ImageIcon className="h-4 w-4" />
                    ?몃꽕???몄쭛
                  </button>
                </div>
                <span className="text-xs text-slate-500">湲怨??몃꽕?쇱쓣 ??怨듦컙?먯꽌 ?섏젙?섍퀬 諛쒗뻾 以鍮꾨? 留덈Т由ы븯?몄슂.</span>
              </div>

              {isGenerating ? (
                <div className="my-4 rounded-lg border border-blue-100 bg-blue-50 p-12 text-center">
                  <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
                  <h3 className="text-sm font-black text-slate-900">??留먰닾??媛源뚯슫 珥덉븞怨??몃꽕??臾멸뎄瑜??뺣━?섎뒗 以묒엯?덈떎.</h3>
                  <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-600">AI媛 ????꾩꽦?섎뒗 ?④퀎媛 ?꾨땲?? ?ъ슜?먭? ?ㅻ벉湲??ъ슫 泥?珥덉븞??以鍮꾪븯???④퀎?낅땲??</p>
                </div>
              ) : activeTab === "blog" ? (
                <BlogPreview content={blogContent} onContentChange={setBlogContent} photos={formState.photos} />
              ) : (
                <ThumbnailPreview
                  thumbnailData={thumbnailData}
                  setThumbnailData={setThumbnailData}
                  selectedPhoto={selectedPhoto}
                  onRecommendCopy={handleRecommendThumbnail}
                />
              )}
              {blogContent.trim().length > 0 && <FooterAdSlot />}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

const guideArticles = [
  {
    slug: "before-publishing-ai-draft",
    title: "AI가 작성한 글을 그대로 발행하기 전에 확인할 것",
    body: ["AI 珥덉븞? 鍮좊Ⅴ寃?援ъ“瑜??≪븘二쇰뒗 異쒕컻?먯엯?덈떎. 諛쒗뻾 ?꾩뿉???ㅼ젣 寃쏀뿕, ?뺤씤 媛?ν븳 ?뺣낫, ??留먰닾??留욎? ?딅뒗 臾몄옣??癒쇱? ?댄렣蹂대뒗 寃껋씠 醫뗭뒿?덈떎.", "媛寃? ?꾩튂, ?댁쁺?쒓컙, ?쒗뭹 ?뺣낫泥섎읆 諛붾????덈뒗 ?댁슜? 怨듭떇 ?섏씠吏???꾩옣 ?뺣낫濡??ㅼ떆 ?뺤씤?섏꽭??", "留덉?留됱쑝濡??쒕ぉ怨??몃꽕??臾멸뎄媛 蹂몃Ц ?댁슜怨?留욌뒗吏 ?뺤씤?섎㈃ ?낆옄媛 湲곕????댁슜怨??ㅼ젣 湲??李⑥씠瑜?以꾩씪 ???덉뒿?덈떎."],
  },
  {
    slug: "add-personal-experience",
    title: "AI 釉붾줈洹?湲????寃쏀뿕???먯뿰?ㅻ읇寃?異붽??섎뒗 諛⑸쾿",
    body: ["媛???ъ슫 諛⑸쾿? AI媛 留뚮뱺 臾몃떒 ?ъ씠???닿? 吏곸젒 蹂닿퀬 ?먮? ?λ㈃???쒕몢 臾몄옣???ｋ뒗 寃껋엯?덈떎.", "?덈? ?ㅼ뼱 留? 遺꾩쐞湲? ?湲??쒓컙, 吏곸썝 ?묐?, ?щ갑臾??섏궗泥섎읆 AI媛 ????????녿뒗 ?댁슜??異붽??섎㈃ 湲????援ъ껜?곸씠 ?⑸땲??", "?쇰컲?곸씤 ?μ젏 ?섏뿴蹂대떎 ?닿? ??洹몃젃寃??먭펷?붿? 吏㏐쾶 ?㏓텤?대뒗 ?몄씠 ?낆옄?먭쾶 ?먯뿰?ㅻ읇寃??꾨떖?⑸땲??"],
  },
  {
    slug: "keep-my-tone",
    title: "??留먰닾瑜??좎??섎㈃??AI瑜??쒖슜?섎뒗 諛⑸쾿",
    body: ["?먯＜ ?곕뒗 臾몄옣 ?앸㎈?? ?대え吏 ?ъ슜 諛⑹떇, ?뚯젣紐?湲몄씠, 臾몃떒 ?명씉???뺥빐 ?먮㈃ AI 珥덉븞??怨좎튂湲??ъ썙吏묐땲??", "湲곗〈 湲 PDF瑜?李멸퀬?먮즺濡??ｌ쓣 ?뚮뒗 臾몄옣??蹂듭궗?섍린蹂대떎 遺꾩쐞湲곗? 援ъ“留?李멸퀬?섎룄濡??ъ슜?섎뒗 寃껋씠 醫뗭뒿?덈떎.", "珥덉븞???덈Т 諛섎벏?섍쾶 ?먭뺨吏硫??됱냼 ?닿? ?곕뒗 ?쒗쁽?쇰줈 ??臾몃떒???ㅼ떆 諛붽퓭 蹂댁꽭??"],
  },
  {
    slug: "ai-like-sentences",
    title: "AI가 쓴 것처럼 보이는 문장의 공통점",
    body: ["?덈Т ?볦? 移?갔, 洹쇨굅 ?녿뒗 ?⑥젙, 諛섎났?섎뒗 ?뺤슜?щ뒗 AI 臾몄옣泥섎읆 ?먭뺨吏????덉뒿?덈떎.", "?뱁엳 吏곸젒 寃れ? ?댁슜 ?놁씠 '?뺣쭚 留뚯”?ㅻ윭?좎뒿?덈떎' 媛숈? 臾몄옣??諛섎났?섎㈃ 湲???좊ː媛먯씠 ?쏀빐吏????덉뒿?덈떎.", "援ъ껜?곸씤 ?λ㈃, ?レ옄 ?뺤씤, ?섎쭔??湲곗????뷀븯硫?臾몄옣?????쇰쪧?곸쑝濡?蹂댁엯?덈떎."],
  },
  {
    slug: "many-photos-flow",
    title: "?ъ쭊??留롮? 釉붾줈洹?湲???먯뿰?ㅻ읇寃?援ъ꽦?섎뒗 諛⑸쾿",
    body: ["?ъ쭊??留롮쓣?섎줉 ?낅줈???쒖꽌蹂대떎 ?낆옄媛 ?댄빐???쒖꽌瑜?癒쇱? ?앷컖?섎뒗 寃껋씠 醫뗭뒿?덈떎.", "?낃뎄, 硫붾돱?? ????λ㈃, ?뷀뀒?? 寃곌낵 ?쒖쑝濡?臾띠쑝硫?湲???먮쫫???덉젙?⑸땲??", "鍮꾩듂???ъ쭊? 洹몃━?쒕줈 臾띔퀬 怨쇱젙???덈뒗 ?ъ쭊? ?щ씪?대뱶泥섎읆 ?댁뼱 蹂댁뿬二쇰㈃ 蹂몃Ц?????딄퉩?덈떎."],
  },
  {
    slug: "good-title-vs-clickbait",
    title: "?대┃留??몃┛ ?쒕ぉ怨?醫뗭? ?쒕ぉ??李⑥씠",
    body: ["醫뗭? ?쒕ぉ? 沅곴툑利앹쓣 留뚮뱾??蹂몃Ц???ㅼ젣濡??듯븷 ???덈뒗 踰붿쐞 ?덉뿉 ?덉뼱???⑸땲??", "怨쇱옣???쒗쁽?대굹 ?ъ떎怨??ㅻⅨ ?쎌냽? ?대┃? 留뚮뱾 ???덉뼱??湲???좊ː瑜??⑥뼱?⑤┫ ???덉뒿?덈떎.", "?μ냼, ?쒗뭹, ?곹솴, ?듭떖 寃쏀뿕??吏㏐쾶 ?쒕윭?대㈃ ?낆옄媛 ?꾩슂??湲?몄? 鍮좊Ⅴ寃??먮떒?????덉뒿?덈떎."],
  },
  {
    slug: "short-thumbnail-copy",
    title: "?몃꽕??臾멸뎄瑜?吏㏐퀬 ?먯뿰?ㅻ읇寃?留뚮뱶??諛⑸쾿",
    body: ["?몃꽕??臾멸뎄???쒕늿???쏀엳??寃껋씠 以묒슂?⑸땲?? 硫붿씤 臾멸뎄??吏㏐쾶, 蹂댁“ 臾멸뎄??蹂몃Ц 留λ씫??議곌툑留?蹂댁셿?섎뒗 ?뺣룄媛 醫뗭뒿?덈떎.", "蹂몃Ц怨??ㅻⅨ 媛뺥븳 ?쒗쁽???곌린蹂대떎 ?ъ쭊怨?湲???듭떖???먯뿰?ㅻ읇寃??뺤텞?섏꽭??", "?????紐⑤컮???붾㈃?먯꽌 湲?먭? ?덈Т ?묎굅???ъ쭊??媛由ъ? ?딅뒗吏 ?뺤씤?섎뒗 ?듦????꾩????⑸땲??"],
  },
  {
    slug: "avoid-ad-like-thumbnail",
    title: "釉붾줈洹??몃꽕?쇱씠 吏?섏튂寃?愿묎퀬泥섎읆 蹂댁씠吏 ?딄쾶 留뚮뱶??諛⑸쾿",
    body: ["???먮굦?? 怨쇰룄???鍮? ?덈Т 留롮? 臾멸뎄??愿묎퀬 ?대?吏泥섎읆 蹂댁씪 ???덉뒿?덈떎.", "?ъ쭊??遺꾩쐞湲곕? ?대━怨??щ갚???④린硫?吏곸젒 留뚮뱺 ??븳 ?먯뿰?ㅻ윭???몄긽??以????덉뒿?덈떎.", "臾멸뎄???ㅼ젣 蹂몃Ц ?댁슜怨?留욎텛怨? ?붿옄?몄? ?쎄린 ?ъ슫 ?뺣룄?먯꽌 硫덉텛???몄씠 醫뗭뒿?덈떎."],
  },
  {
    slug: "how-far-use-ai-tool",
    title: "AI 釉붾줈洹??꾧뎄???대뵒源뚯? ?쒖슜?섎뒗 寃껋씠 醫뗭쓣源?",
    body: ["AI??珥덉븞, 援ъ꽦 ?뺣━, ?몃꽕??臾멸뎄 ?꾩씠?붿뼱泥섎읆 ?쒓컙??以꾩씠???묒뾽????留욎뒿?덈떎.", "諛섎?濡??ㅼ젣 ?먮떒, 寃쏀뿕, ?ъ떎 ?뺤씤, 理쒖쥌 諛쒗뻾 ?щ????ъ슜?먭? 留≪븘???⑸땲??", "?먮룞 ?앹꽦蹂대떎 以묒슂??寃껋? ???ъ쭊, ??湲곗?, ???쒗쁽??湲 ?덉뿉 ?⑥븘 ?덈뒗吏?낅땲??"],
  },
  {
    slug: "final-checklist",
    title: "블로그 글 발행 전 최종 점검 체크리스트",
    body: ["諛쒗뻾 ?꾩뿉???ㅼ젣 寃쏀뿕 異붽?, ?ъ떎 ?뺣낫 ?뺤씤, ?댁깋??臾몄옣 ?섏젙, ?ъ쭊 ?쒖꽌 ?먭?, 諛섎났 ?쒗쁽 ?뺣━瑜??뺤씤?섏꽭??", "?쒕ぉ怨??몃꽕??臾멸뎄媛 ?ㅼ젣 ?댁슜怨??쇱튂?섎뒗吏??以묒슂?⑸땲??", "留덉?留됱쑝濡?留욎땄踰뺢낵 ?ㅽ깉?먮? ?뺤씤?섎㈃ 珥덉븞????湲??媛源뚯슫 ?꾩꽦蹂몄쑝濡??ㅻ벉?댁쭛?덈떎."],
  },
  {
    slug: "restaurant-review-must-add",
    title: "留쏆쭛 ?꾧린 湲??諛섎뱶??吏곸젒 異붽??댁빞 ?섎뒗 ?댁슜",
    body: ["留쏆쭛 ?꾧린??AI媛 ????????녿뒗 ?꾩옣媛먯씠 以묒슂?⑸땲?? 諛⑸Ц ?쒓컙, ?湲??щ?, ?ㅼ젣 二쇰Ц 硫붾돱, 留쏆쓽 湲곗?, ?? 媛寃?泥닿컧 ?깆쓣 吏곸젒 異붽??섏꽭??", "二쇱감, ?덉빟, 醫뚯꽍 媛꾧꺽, ?쇱옟?꾩쿂??諛⑸Ц?먭? 沅곴툑?댄븷 ?댁슜???꾩????⑸땲??", "?ㅻ쭔 ?댁쁺?쒓컙怨?媛寃⑹? 諛붾????덉쑝誘濡?諛쒗뻾 ?꾩뿉 ?ㅼ떆 ?뺤씤?섎뒗 ?몄씠 醫뗭뒿?덈떎."],
  },
  {
    slug: "product-review-human-judgment",
    title: "?쒗뭹 由щ럭?먯꽌 AI媛 ????먮떒?섎㈃ ???섎뒗 ?댁슜",
    body: ["?쒗뭹 由щ럭?먯꽌 留뚯”?? ?닿뎄?? ?ъ슜媛? ?ш뎄留??섏궗???ㅼ젣 ?ъ슜?먯쓽 ?먮떒???ㅼ뼱媛???⑸땲??", "AI媛 ?쇰컲?곸씤 ?λ떒?먯쓣 ?뺣━???섎뒗 ?덉?留??닿? ?ъ슜???섍꼍怨?湲곗?? 吏곸젒 ?⑥빞 ?⑸땲??", "?ㅽ럺, 媛寃? 援ъ꽦?? 蹂댁쬆 議곌굔? ?먮ℓ泥섎굹 ?쒖“???뺣낫瑜??뺤씤????諛섏쁺?섏꽭??"],
  },
];

const guideMarkdownOverrides: Record<string, string> = {
  "before-publishing-ai-draft": beforePublishingGuide,
  "add-personal-experience": addPersonalExperienceGuide,
  "keep-my-tone": keepMyToneGuide,
  "ai-like-sentences": aiLikeSentencesGuide,
  "many-photos-flow": manyPhotosFlowGuide,
  "good-title-vs-clickbait": goodTitleVsClickbaitGuide,
  "short-thumbnail-copy": shortThumbnailCopyGuide,
  "avoid-ad-like-thumbnail": avoidAdLikeThumbnailGuide,
  "how-far-use-ai-tool": howFarUseAiToolGuide,
  "final-checklist": finalChecklistGuide,
  "restaurant-review-must-add": restaurantReviewMustAddGuide,
  "product-review-human-judgment": productReviewHumanJudgmentGuide,
};

const datePlaceholders = {
  publishedAt: "[?묒꽦???낅젰 ?꾩슂]",
  updatedAt: "[?낅뜲?댄듃???낅젰 ?꾩슂]",
};

const defaultGuideMeta: Omit<GuideArticleData, "slug" | "title" | "summary" | "body" | "content"> = {
  category: "AI 湲?곌린",
  publishedAt: datePlaceholders.publishedAt,
  updatedAt: datePlaceholders.updatedAt,
  readingTime: "3분",
  relatedSlugs: [],
};

const guideMeta: Record<string, Omit<GuideArticleData, "slug" | "title" | "summary" | "body" | "content">> = {
  "before-publishing-ai-draft": {
    category: "諛쒗뻾 ???먭?",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "6분",
    relatedSlugs: ["add-personal-experience", "keep-my-tone", "final-checklist"],
  },
  "add-personal-experience": {
    category: "AI 湲?곌린",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "5분",
    relatedSlugs: ["before-publishing-ai-draft", "keep-my-tone", "many-photos-flow"],
  },
  "keep-my-tone": {
    category: "留먰닾 ?몄쭛",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "7분",
    relatedSlugs: ["before-publishing-ai-draft", "add-personal-experience", "ai-like-sentences"],
  },
  "ai-like-sentences": {
    category: "留먰닾 ?몄쭛",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "3분",
    relatedSlugs: ["keep-my-tone", "add-personal-experience", "final-checklist"],
  },
  "many-photos-flow": {
    category: "?ъ쭊 ?쒖슜",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "3분",
    relatedSlugs: ["add-personal-experience", "before-publishing-ai-draft", "short-thumbnail-copy"],
  },
  "good-title-vs-clickbait": {
    category: "제목과 썸네일",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "3분",
    relatedSlugs: ["short-thumbnail-copy", "avoid-ad-like-thumbnail", "before-publishing-ai-draft"],
  },
  "short-thumbnail-copy": {
    category: "제목과 썸네일",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "3분",
    relatedSlugs: ["good-title-vs-clickbait", "avoid-ad-like-thumbnail", "many-photos-flow"],
  },
  "avoid-ad-like-thumbnail": {
    category: "제목과 썸네일",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "3분",
    relatedSlugs: ["short-thumbnail-copy", "good-title-vs-clickbait", "before-publishing-ai-draft"],
  },
  "how-far-use-ai-tool": {
    category: "AI 湲?곌린",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "3분",
    relatedSlugs: ["before-publishing-ai-draft", "add-personal-experience", "keep-my-tone"],
  },
  "final-checklist": {
    category: "諛쒗뻾 ???먭?",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "3분",
    relatedSlugs: ["before-publishing-ai-draft", "add-personal-experience", "keep-my-tone"],
  },
  "restaurant-review-must-add": {
    category: "AI 湲?곌린",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "3분",
    relatedSlugs: ["add-personal-experience", "many-photos-flow", "before-publishing-ai-draft"],
  },
  "product-review-human-judgment": {
    category: "AI 湲?곌린",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "3분",
    relatedSlugs: ["add-personal-experience", "before-publishing-ai-draft", "keep-my-tone"],
  },
};

function getMarkdownTitle(markdown: string) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || "";
}

function getMarkdownSummary(markdown: string) {
  return (
    markdown
      .replace(/^#\s+.+$/m, "")
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .find((block) => block && !block.startsWith("#") && !block.startsWith("|") && !block.startsWith("-")) || ""
  );
}

const hydratedGuideArticles: GuideArticleData[] = guideArticles.map((guide) => {
  const markdown = guideMarkdownOverrides[guide.slug];
  const meta = guideMeta[guide.slug] || defaultGuideMeta;
  const summary = markdown ? getMarkdownSummary(markdown) || guide.body[0] : guide.body[0];

  return {
    ...guide,
    ...meta,
    title: markdown ? getMarkdownTitle(markdown) || guide.title : guide.title,
    summary,
    body: markdown ? [summary] : guide.body,
    ...(markdown ? { content: markdown.replace(/^#\s+.+\n?/, "").trim() } : {}),
  };
});

function GuideIndexPage() {
  const guides = useMemo(() => hydratedGuideArticles, []);
  const categories = useMemo(() => ["?꾩껜", ...Array.from(new Set(guides.map((guide) => guide.category)))], [guides]);
  const [selectedCategory, setSelectedCategory] = useState("?꾩껜");
  const filteredGuides = selectedCategory === "?꾩껜" ? guides : guides.filter((guide) => guide.category === selectedCategory);

  return (
    <>
      <SEO
        title={pageSeo.guide.title}
        description={pageSeo.guide.description}
        path="/guide"
        structuredData={webPageJsonLd("CollectionPage", "釉붾줈洹??묒꽦 媛?대뱶", pageSeo.guide.description, "/guide")}
      />
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">BlogDraft Guide</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">釉붾줈洹??묒꽦 媛?대뱶</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            AI 珥덉븞????寃쏀뿕怨?留먰닾濡??ㅻ벉怨? ?ъ쭊怨??몃꽕?쇨퉴吏 ?먯뿰?ㅻ읇寃??꾩꽦?섎뒗 諛⑸쾿???뺣━?덉뒿?덈떎.
          </p>
        </header>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black transition ${selectedCategory === category ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"}`}
            >
              {category}
            </button>
          ))}
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGuides.map((guide) => (
            <article key={guide.slug} id={guide.slug} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">{guide.category}</p>
              <h2 className="mt-2 text-lg font-black leading-6 text-slate-950">{guide.title}</h2>
              <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-600">{guide.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                <span>{guide.readingTime}</span>
                <span>?낅뜲?댄듃 {guide.updatedAt}</span>
              </div>
              <Link to={`/guide/${guide.slug}`} className="mt-4 inline-block text-xs font-black text-blue-700 hover:underline">?먯꽭??蹂닿린</Link>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}

function GuideNotFoundPage() {
  const { slug } = useParams();
  const path = slug ? `/guide/${slug}` : "/404";

  return (
    <>
      <SEO
        title={pageSeo.notFound.title}
        description={pageSeo.notFound.description}
        path={path}
        noindex
      />
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">BlogDraft Guide</p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">媛?대뱶瑜?李얠쓣 ???놁뒿?덈떎</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          二쇱냼媛 諛붾뚯뿀嫄곕굹 議댁옱?섏? ?딅뒗 媛?대뱶?낅땲?? 媛?대뱶 紐⑸줉?먯꽌 ?ㅻⅨ 湲???뺤씤??二쇱꽭??
        </p>
        <Link to="/guide" className="mt-6 inline-block text-sm font-black text-blue-700 hover:underline">
          媛?대뱶 紐⑸줉?쇰줈 ?뚯븘媛湲?        </Link>
      </main>
    </>
  );
}

function GuideArticleDetailPage() {
  const { slug } = useParams();
  const article = hydratedGuideArticles.find((guide) => guide.slug === slug);
  if (!article) return <GuideNotFoundPage />;
  const path = `/guide/${article.slug}`;
  const title = `${article.title} | BlogDraft`;

  const relatedArticles = article.relatedSlugs
    .map((relatedSlug) => hydratedGuideArticles.find((guide) => guide.slug === relatedSlug))
    .filter((guide): guide is GuideArticleData => Boolean(guide) && guide.slug !== article.slug)
    .slice(0, 3);

  return (
    <>
      <SEO
        title={title}
        description={article.summary}
        path={path}
        type="article"
        structuredData={[articleJsonLd(article, path), breadcrumbJsonLd(article, path)]}
      />
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <GuideArticleLayout article={article} relatedArticles={relatedArticles} />
    </>
  );
}

function StaticPage({ title, children }: { title: string; children: React.ReactNode }) {
  if (window.location.pathname === "/privacy") return <PrivacyPage />;
  if (window.location.pathname === "/about") return <AboutPage />;

  return (
    <>
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-black text-slate-950">{title}</h1>
        <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">{children}</div>
      </main>
    </>
  );
}

function PrivacyPage() {
  return (
    <>
      <SEO
        title={pageSeo.privacy.title}
        description={pageSeo.privacy.description}
        path="/privacy"
        structuredData={webPageJsonLd("WebPage", "媛쒖씤?뺣낫泥섎━諛⑹묠", pageSeo.privacy.description, "/privacy")}
      />
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <PolicyLayout title="媛쒖씤?뺣낫泥섎━諛⑹묠" description="BlogDraft ?댁슜 怨쇱젙?먯꽌 泥섎━?????덈뒗 ?뺣낫? 蹂닿? 諛⑹떇, ?댁슜?먯쓽 沅뚮━瑜??덈궡?⑸땲??">
        <PolicySection title="1. 媛쒖씤?뺣낫泥섎━諛⑹묠 媛쒖슂">
          <p>BlogDraft???ъ쭊, 李멸퀬?먮즺, ?ъ슜???붿껌??諛뷀깢?쇰줈 ?섏젙 媛?ν븳 釉붾줈洹?珥덉븞怨??몃꽕??臾멸뎄 ?묒꽦???뺣뒗 ?쒕퉬?ㅼ엯?덈떎. ?ъ슜?먭? ?낅젰?섍굅???낅줈?쒗븳 ?먮즺??珥덉븞 ?앹꽦, ?ъ쭊 ?먮쫫 遺꾩꽍, ?몃꽕??臾멸뎄 異붿쿇, ?ㅻ쪟 ?뺤씤怨??쒕퉬???덉젙?붾? ?꾪빐 ?꾩슂??踰붿쐞?먯꽌 泥섎━?⑸땲??</p>
        </PolicySection>

        <PolicySection title="2. 泥섎━?????덈뒗 ?뺣낫">
          <h3 className="font-black text-slate-950">?ъ슜?먭? 吏곸젒 ?낅젰?섍굅???낅줈?쒗븯???뺣낫</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>釉붾줈洹??묒꽦 ?붿껌?ы빆, 留먰닾 諛??ㅽ????ㅼ젙</li>
            <li>?낅줈?쒗븳 ?ъ쭊, 李멸퀬??PDF, 李멸퀬???몃꽕???대?吏</li>
            <li>?ъ슜?먭? 吏곸젒 ?낅젰??OpenAI API Key ?먮뒗 Gemini API Key</li>
          </ul>
          <h3 className="font-black text-slate-950">?쒕퉬???댁슜 怨쇱젙?먯꽌 ?앹꽦?????덈뒗 ?뺣낫</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>?묒냽 ?쇱떆, ?ㅻ쪟 湲곕줉, 釉뚮씪?곗? 諛?湲곌린 愿??湲곕낯 ?뺣낫</li>
            <li>?쒕퉬???댁슜 ?잛닔</li>
            <li>釉뚮씪?곗? localStorage????λ릺??珥덉븞, ?ㅼ젙媛? ?ъ슜?먭? 湲곗뼲?섍린瑜??좏깮??媛쒖씤 API Key</li>
          </ul>
        </PolicySection>

        <PolicySection title="3. ?댁슜 紐⑹쟻">
          <ul className="list-disc space-y-1 pl-5">
            <li>釉붾줈洹?珥덉븞 ?앹꽦怨??ъ쭊 ?먮쫫 諛??몃꽕??臾멸뎄 異붿쿇</li>
            <li>?ъ슜?먭? ?ㅼ젙??留먰닾, ?ㅽ??? ?붿껌?ы빆 諛섏쁺</li>
            <li>서비스 오류 확인 및 기능 안정화</li>
            <li>?ъ슜???ㅼ젙怨??묒꽦 以?寃곌낵 蹂댁〈</li>
          </ul>
        </PolicySection>

        <PolicySection title="4. ?낅줈???먮즺 泥섎━">
          <p>?ъ쭊怨?PDF??AI 珥덉븞 ?앹꽦???꾪빐 ?ъ슜?먭? ?좏깮???몃? AI ?쒕퉬?ㅻ줈 ?꾩넚?????덉쑝硫? ?꾩옱 ?좏깮 媛?ν븳 ?몃? AI ?쒕퉬?ㅻ뒗 OpenAI API? Google Gemini API?낅땲?? ?ъ슜?먮뒗 ?낅줈??????몄쓽 媛쒖씤?뺣낫, ?쇨뎬, 二쇱냼, ?곕씫泥? 誘쇨컧??臾몄꽌媛 ?ы븿?섏뼱 ?덉? ?딆?吏 ?뺤씤?댁빞 ?⑸땲??</p>
          <p>?꾩옱 ?쒕쾭 肄붾뱶??multer??memoryStorage瑜??ъ슜?섎ŉ, ?붿껌 泥섎━ ???낅줈???뚯씪???쒕쾭 ?붿뒪?ъ뿉 蹂꾨룄 ?뚯씪濡??곴뎄 ??ν븯吏 ?딆뒿?덈떎. ?ㅻ쭔 ?몃? AI ?쒓났?먯쓽 泥섎━ 諛⑹떇? ?대떦 ?쒓났?먯쓽 ?뺤콉???곸슜?????덉뒿?덈떎.</p>
        </PolicySection>

        <PolicySection title="5. 媛쒖씤 API Key 泥섎━">
          <p>媛쒖씤 OpenAI API Key ?먮뒗 Gemini API Key???ъ슜?먭? ?좏깮???쒓났?먯쓽 AI ?붿껌??泥섎━?섍린 ?꾪빐?쒕쭔 ?ъ슜?⑸땲?? ???쒓났?먯쓽 ?ㅻ? ?ㅻⅨ ?쒓났???붿껌???ъ슜?섏? ?딆쑝硫? ?쒕쾭 肄섏넄?대굹 濡쒓렇??API Key瑜?異쒕젰?섏? ?딆뒿?덈떎.</p>
          <p>媛쒖씤 API Key??湲곕낯?곸쑝濡??꾩옱 釉뚮씪?곗? ?몄뀡?먯꽌留??좎??⑸땲?? ?ъ슜?먭? ?쒖씠 湲곌린??API Key 湲곗뼲?섍린?앸? 吏곸젒 ?좏깮??寃쎌슦?먮쭔 ?대떦 湲곌린??localStorage????λ맗?덈떎. 怨듭슜 PC?먯꽌??媛쒖씤 API Key瑜???ν븯吏 ?딅뒗 寃껋씠 醫뗭쑝硫? ??λ맂 ????젣 ?먮뒗 ?ъ씠??珥덇린?붾? ?듯빐 釉뚮씪?곗? ????곗씠?곕? 吏?????덉뒿?덈떎.</p>
        </PolicySection>

        <PolicySection title="6. 蹂댁쑀 諛??댁슜 湲곌컙">
          <ul className="list-disc space-y-1 pl-5">
            <li>釉뚮씪?곗? localStorage ?곗씠?? ?ъ슜?먭? 吏곸젒 ??젣?섍굅???ъ씠??珥덇린??湲곕뒫???ъ슜???뚭퉴吏</li>
            <li>?쒕쾭 ?붿껌 泥섎━???뚯씪: ?붿껌 泥섎━媛 ?앸궃 ??蹂꾨룄 ??ν븯吏 ?딅뒗 援ъ“?대?濡?吏??蹂닿??섏? ?딆쓬</li>
            <li>?ㅻ쪟 濡쒓렇: [?ㅻ쪟 濡쒓렇 蹂닿? 湲곌컙 寃곗젙 ?꾩슂]</li>
            <li>臾몄쓽 ?댁뿭: [臾몄쓽 ?댁뿭 蹂닿? 湲곌컙 寃곗젙 ?꾩슂]</li>
          </ul>
        </PolicySection>

        <PolicySection title="7. ?????쒕퉬??諛?援?쇅 泥섎━ 媛?μ꽦">
          <p>BlogDraft???ъ슜?먭? ?좏깮???쒓났?먯뿉 ?곕씪 OpenAI API ?먮뒗 Google Gemini API瑜??ъ슜?⑸땲?? ?ъ슜?먭? ?낅젰?섍굅???낅줈?쒗븳 ?먮즺媛 OpenAI ?먮뒗 Google???쒕쾭瑜??듯빐 泥섎━?????덉쑝硫? 援ъ껜?곸씤 泥섎━ ?꾩튂, 湲곌컙, 諛⑹떇? 媛??쒓났?먯쓽 ?뺤콉???곸슜?????덉쑝誘濡?怨듭떇 ?뺤콉???④퍡 ?뺤씤?댁빞 ?⑸땲??</p>
          <InfoBox title="?몃? ?뺤콉 ?뺤씤 ?꾩튂">
            <p>OpenAI API, Google Gemini API 諛?媛??쒓났?먯쓽 媛쒖씤?뺣낫 愿??怨듭떇 ?뺤콉 留곹겕 ?낅젰 ?먮뒗 理쒖떊 怨듭떇 臾몄꽌 ?곌껐 ?꾩슂</p>
          </InfoBox>
        </PolicySection>

        <PolicySection title="8. 荑좏궎 諛?愿묎퀬 愿???덈궡">
          <p>?꾩옱 ?쒕퉬?ㅻ뒗 Google AdSense 愿묎퀬瑜??뺤떇 ?댁쁺?섍퀬 ?덉? ?딆뒿?덈떎. ?ν썑 愿묎퀬 ?쒕퉬?ㅺ? ?꾩엯?섎㈃ Google 諛?????愿묎퀬?낆껜媛 荑좏궎 ?깆쓣 ?ъ슜??愿묎퀬瑜??쒓났?????덉쑝硫? 愿???댁슜? 蹂?媛쒖씤?뺣낫泥섎━諛⑹묠??諛섏쁺?섍퀬 蹂꾨룄濡??덈궡?⑸땲??</p>
        </PolicySection>

        <PolicySection title="9. ?댁슜?먯쓽 沅뚮━">
          <ul className="list-disc space-y-1 pl-5">
            <li>釉뚮씪?곗? ????곗씠????젣</li>
            <li>媛쒖씤?뺣낫 愿??臾몄쓽</li>
            <li>?낅줈????媛쒖씤?뺣낫 ?쒓굅</li>
            <li>媛쒖씤 API Key 蹂寃??먮뒗 ??젣</li>
            <li>?쒕퉬???댁슜 以묐떒</li>
          </ul>
        </PolicySection>

        <PolicySection title="10. ?덉쟾議곗튂">
          <ul className="list-disc space-y-1 pl-5">
            <li>API Key瑜??쒕쾭 濡쒓렇濡?異쒕젰?섏? ?딆쓬</li>
            <li>?뚯씪 ?ш린 ?쒗븳 ?곸슜</li>
            <li>?낅줈???덉슜 ?뚯씪 ?뺤떇 ?뺤씤</li>
            <li>?쒕쾭 ?붿뒪?ъ뿉 ?낅줈???뚯씪???곴뎄 ??ν븯吏 ?딅뒗 援ъ“</li>
          </ul>
        </PolicySection>

        <PolicySection title="11. 媛쒖씤?뺣낫 愿??臾몄쓽">
          <ContactInfoBox privacy />
        </PolicySection>

        <PolicySection title="12. ?쒗뻾??諛?蹂寃??덈궡">
          <p>?쒗뻾?? [?쒗뻾???낅젰 ?꾩슂]</p>
          <p>?뺤콉 蹂寃??????섏씠吏??蹂寃??댁슜??怨좎??⑸땲??</p>
        </PolicySection>
      </PolicyLayout>
    </>
  );
}

function TermsPage() {
  return (
    <>
      <SEO
        title={pageSeo.terms.title}
        description={pageSeo.terms.description}
        path="/terms"
        structuredData={webPageJsonLd("WebPage", "?댁슜?쎄?", pageSeo.terms.description, "/terms")}
      />
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <PolicyLayout title="?댁슜?쎄?" description="BlogDraft瑜??댁슜????吏耳쒖빞 ??湲곕낯 議곌굔怨?AI 寃곌낵臾??댁슜 梨낆엫???덈궡?⑸땲??">
        <PolicySection title="?쒕퉬??紐⑹쟻">
          <p>BlogDraft???ъ쭊, 李멸퀬?먮즺? ?ъ슜???붿껌??諛뷀깢?쇰줈 ?섏젙 媛?ν븳 釉붾줈洹?珥덉븞怨??몃꽕???쒖옉???뺣뒗 ?꾧뎄?낅땲??</p>
        </PolicySection>
        <PolicySection title="?쒕퉬???댁슜 議곌굔">
          <ul className="list-disc space-y-1 pl-5">
            <li>?ъ슜?먮뒗 ?곷쾿?섍쾶 ?ъ슜??沅뚰븳???덈뒗 ?먮즺留??낅줈?쒗빐???⑸땲??</li>
            <li>??몄쓽 ?ъ쭊, 湲, 媛쒖씤?뺣낫? ??묐Ъ??臾대떒?쇰줈 ?낅줈?쒗븯嫄곕굹 蹂듭젣?섎㈃ ???⑸땲??</li>
            <li>遺덈쾿?곸씠嫄곕굹 ??몄쓽 沅뚮━瑜?移⑦빐?섎뒗 紐⑹쟻?쇰줈 ?댁슜?댁꽌?????⑸땲??</li>
            <li>媛쒖씤 API Key??愿由?梨낆엫? ?ъ슜?먯뿉寃??덉뒿?덈떎.</li>
          </ul>
        </PolicySection>
        <PolicySection title="AI 寃곌낵臾쇱쓽 ?깃꺽">
          <ul className="list-disc space-y-1 pl-5">
            <li>AI 寃곌낵??李멸퀬??珥덉븞?대ŉ ?ъ떎?? ?뺥솗?? ?꾩쟾?? 寃???몄텧怨??섏씡??蹂댁옣?섏? ?딆뒿?덈떎.</li>
            <li>媛寃? 二쇱냼, ?댁쁺?쒓컙, ?쒗뭹 ?ъ뼇 ?깆? ?ъ슜?먭? 吏곸젒 寃利앺빐???⑸땲??</li>
            <li>理쒖쥌 ?몄쭛怨?諛쒗뻾 梨낆엫? ?ъ슜?먯뿉寃??덉뒿?덈떎.</li>
          </ul>
        </PolicySection>
        <PolicySection title="서비스 제공과 변경">
          <p>?몃? API ?μ븷, ?ъ슜???쒗븳, ?좎?蹂댁닔濡?湲곕뒫???쇱떆 以묐떒?????덉뒿?덈떎. 湲곕뒫怨??ъ슜 議곌굔? ?쒕퉬???댁쁺 怨쇱젙?먯꽌 蹂寃쎈맆 ???덉쑝硫? 以묒슂??蹂寃쎌? ?ъ씠?몄뿉???덈궡?⑸땲??</p>
        </PolicySection>
        <PolicySection title="湲덉??됱쐞">
          <ul className="list-disc space-y-1 pl-5">
            <li>??몄쓽 API Key 臾대떒 ?ъ슜</li>
            <li>?먮룞?붾맂 怨쇰룄??諛섎났 ?붿껌 ?먮뒗 ?앹꽦 ?쒗븳 ?고쉶 ?쒕룄</li>
            <li>?쒕퉬???덉젙?깆쓣 諛⑺빐?섎뒗 ?됱쐞</li>
            <li>遺덈쾿 肄섑뀗痢? ?ъ묶, 紐낆삁?쇱넀 肄섑뀗痢??앹꽦</li>
            <li>저작권이나 개인정보를 침해하는 자료 업로드</li>
          </ul>
        </PolicySection>
        <PolicySection title="梨낆엫 ?쒗븳">
          <p>AI 寃곌낵???ㅻ쪟濡??명븳 理쒖쥌 梨낆엫? ?ъ슜?먯쓽 寃?좎? 諛쒗뻾 ?щ????곕씪 ?щ씪吏????덉뒿?덈떎. ?몃? AI ?쒕퉬?ㅻ굹 ?ㅽ듃?뚰겕 ?μ븷媛 諛쒖깮?????덉쑝誘濡??쒕퉬?ㅺ? 紐⑤뱺 寃곌낵瑜?蹂댁옣???섎뒗 ?놁뒿?덈떎.</p>
        </PolicySection>
        <PolicySection title="이용약관 시행일">
          <p>[?쒗뻾???낅젰 ?꾩슂]</p>
        </PolicySection>
      </PolicyLayout>
    </>
  );
}

function ContactPage() {
  return (
    <>
      <SEO
        title={pageSeo.contact.title}
        description={pageSeo.contact.description}
        path="/contact"
        structuredData={webPageJsonLd("ContactPage", "臾몄쓽?섍린", pageSeo.contact.description, "/contact")}
      />
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <PolicyLayout title="臾몄쓽?섍린" description="?쒕퉬???ㅻ쪟, 媛쒖씤?뺣낫, ??묎텒, ?쒗쑕? 湲곕뒫 媛쒖꽑 ?쒖븞???대찓?쇰줈 臾몄쓽?????덉뒿?덈떎.">
        <PolicySection title="臾몄쓽 媛?ν븳 ?댁슜">
          <ul className="list-disc space-y-1 pl-5">
            <li>?쒕퉬???ㅻ쪟 臾몄쓽</li>
            <li>媛쒖씤?뺣낫 臾몄쓽</li>
            <li>??묎텒 移⑦빐 ?좉퀬</li>
            <li>?쒗쑕 諛?愿묎퀬 臾몄쓽</li>
            <li>湲곕뒫 媛쒖꽑 ?쒖븞</li>
          </ul>
        </PolicySection>
        <PolicySection title="臾몄쓽 諛⑸쾿">
          <p>?꾩옱 ?ㅼ젣 ?꾩넚 湲곕뒫???곌껐??臾몄쓽 ?쇱? ?쒓났?섏? ?딆뒿?덈떎. ?꾨옒 ?대찓?쇰줈 臾몄쓽??二쇱꽭??</p>
          <ContactInfoBox />
        </PolicySection>
        <PolicySection title="臾몄쓽 ???④퍡 蹂대궡硫?醫뗭? ?뺣낫">
          <ul className="list-disc space-y-1 pl-5">
            <li>諛쒖깮???붾㈃ ?먮뒗 湲곕뒫</li>
            <li>?ㅻ쪟 硫붿떆吏</li>
            <li>?ъ슜??釉뚮씪?곗? 諛?湲곌린</li>
            <li>臾몄젣 諛쒖깮 ?쒓컖</li>
          </ul>
          <InfoBox title="二쇱쓽">
            <p>媛쒖씤?뺣낫? OpenAI ?먮뒗 Gemini API Key??臾몄쓽 ?댁슜???ы븿?섏? 留먯븘 二쇱꽭??</p>
          </InfoBox>
        </PolicySection>
      </PolicyLayout>
    </>
  );
}

function CopyrightPage() {
  return (
    <>
      <SEO
        title={pageSeo.copyright.title}
        description={pageSeo.copyright.description}
        path="/copyright"
        structuredData={webPageJsonLd("WebPage", "肄섑뀗痢?諛???묎텒 ?덈궡", pageSeo.copyright.description, "/copyright")}
      />
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <PolicyLayout title="肄섑뀗痢?諛???묎텒 ?덈궡" description="?낅줈???먮즺? AI 寃곌낵臾쇱쓣 ?ъ슜?????뺤씤?댁빞 ????묎텒, 珥덉긽沅? 媛쒖씤?뺣낫 愿??湲곗??낅땲??">
        <PolicySection title="?낅줈???먮즺??沅뚮━">
          <p>?ъ슜?먭? ?낅줈?쒗븯???ъ쭊, PDF? 湲? ?ъ슜?먭? ?곷쾿?섍쾶 ?댁슜??沅뚮━媛 ?덉뼱???⑸땲?? ??몄쓽 釉붾줈洹?湲??洹몃?濡?蹂듭젣?섍린 ?꾪븳 ?⑸룄濡??쒕퉬?ㅻ? ?ъ슜?섎㈃ ???⑸땲??</p>
        </PolicySection>
        <PolicySection title="李멸퀬 ?먮즺???ъ슜 諛⑹떇">
          <p>李멸퀬 PDF??留먰닾, 臾몄옣 ?명씉, 援ъ꽦怨?遺꾩쐞湲곕? 李멸퀬?섎뒗 紐⑹쟻?쇰줈 ?ъ슜?⑸땲?? ?뱀젙 ?묒꽦?먯쓽 臾몄옣??洹몃?濡?蹂듭궗?섍굅??紐⑤갑?섎뒗 寃곌낵媛 諛쒓껄?섎㈃ ?ъ슜?먭? ?섏젙?댁빞 ?⑸땲??</p>
        </PolicySection>
        <PolicySection title="諛쒗뻾 ???뺤씤 ?ы빆">
          <ul className="list-disc space-y-1 pl-5">
            <li>AI 寃곌낵臾쇱뿉 ???먯쓽 ?곹몴, ??묐Ъ ?먮뒗 媛쒖씤?뺣낫媛 ?ы븿?섏? ?딆븯?붿? ?뺤씤</li>
            <li>?몃꽕?쇱뿉 ?ъ슜?섎뒗 ?ъ쭊怨??고듃???댁슜 沅뚰븳 ?뺤씤</li>
            <li>??몄쓽 ?쇨뎬, 二쇱냼, ?곕씫泥??깆씠 ?몄텧?섏? ?딅룄濡??섏젙</li>
          </ul>
        </PolicySection>
        <PolicySection title="??묎텒 移⑦빐 ?좉퀬">
          <p>沅뚮━ 移⑦빐媛 ?섏떖?섎뒗 肄섑뀗痢좉? ?덈떎硫?移⑦빐 ??? 沅뚮━???뺣낫, ?뺤씤 媛?ν븳 URL ?먮뒗 ?먮즺 ?ㅻ챸???ы븿??臾몄쓽??二쇱꽭??</p>
          <ContactInfoBox />
        </PolicySection>
      </PolicyLayout>
    </>
  );
}

function AiPolicyPage() {
  return (
    <>
      <SEO
        title={pageSeo.aiPolicy.title}
        description={pageSeo.aiPolicy.description}
        path="/ai-policy"
        structuredData={webPageJsonLd("WebPage", "AI ?앹꽦 寃곌낵 ?댁슜 ?덈궡", pageSeo.aiPolicy.description, "/ai-policy")}
      />
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <PolicyLayout title="AI ?앹꽦 寃곌낵 ?댁슜 ?덈궡" description="AI??珥덉븞??留뚮뱾怨? 留덉?留??꾩꽦? ?ъ슜?먭? ?⑸땲?? BlogDraft媛 吏?ν븯???몄쭛 ?먯튃???덈궡?⑸땲??">
        <InfoBox title="?듭떖 ?먯튃">
          <p>AI媛 ?뺣━?섍퀬, ?닿? ?꾩꽦?⑸땲?? ?ъ슜?먯쓽 ?ъ쭊, 寃쏀뿕怨??먮떒??肄섑뀗痢좎쓽 ?듭떖?낅땲??</p>
        </InfoBox>
        <PolicySection title="그대로 발행하기보다 직접 다듬기">
          <p>AI 寃곌낵??鍮좊Ⅸ 異쒕컻?먯엯?덈떎. 洹몃?濡?諛쒗뻾?섍린蹂대떎???ㅼ젣 寃쏀뿕, ?먮? ?? 吏곸젒 ?뺤씤???뺣낫瑜?異붽??섎뒗 寃껋쓣 沅뚯옣?⑸땲??</p>
        </PolicySection>
        <PolicySection title="발행 전 확인할 것">
          <ul className="list-disc space-y-1 pl-5">
            <li>가격, 주소, 운영시간, 제품 사양 등 사실 정보 재확인</li>
            <li>??留먰닾??留욎? ?딅뒗 臾몄옣 ?섏젙</li>
            <li>怨쇱옣???쒕ぉ?대굹 ?몃꽕??臾멸뎄 ?섏젙</li>
            <li>?섎즺, 踰뺣쪧, 湲덉쑖, ?덉쟾 ??以묒슂???뺣낫???꾨Ц媛??怨듭떇 ?먮즺 ?뺤씤</li>
          </ul>
        </PolicySection>
        <PolicySection title="蹂댁옣?섏? ?딅뒗 ?ы빆">
          <p>BlogDraft??寃???몄텧, 釉붾줈洹?吏?섏? ?섏씡??蹂댁옣?섏? ?딆뒿?덈떎. 醫뗭? 肄섑뀗痢좊뒗 ?ъ슜?먯쓽 ?ㅼ젣 ?ъ쭊, 寃쏀뿕, ?먮떒, 理쒖쥌 ?몄쭛???듯빐 ?꾩꽦?⑸땲??</p>
        </PolicySection>
      </PolicyLayout>
    </>
  );
}

function AboutPage() {
  return (
    <>
      <SEO
        title={pageSeo.about.title}
        description={pageSeo.about.description}
        path="/about"
        structuredData={webPageJsonLd("AboutPage", "?쒕퉬???뚭컻", pageSeo.about.description, "/about")}
      />
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <PolicyLayout title="?쒕퉬???뚭컻" description="湲? ??留먰닾泥섎읆, ?몃꽕?쇱? ?닿? 留뚮뱺 寃껋쿂?? BlogDraft媛 ?뺣뒗 ?묒뾽 諛⑹떇?낅땲??">
        <InfoBox title="BlogDraft??諛⑺뼢">
          <p>AI媛 ?뺣━?섍퀬, ?닿? ?꾩꽦?⑸땲??</p>
        </InfoBox>
        <PolicySection title="?쒕퉬?ㅺ? ?닿껐?섎젮??臾몄젣">
          <p>釉붾줈洹?湲???곕젮硫??ъ쭊??怨좊Ⅴ怨? ?먮쫫???↔퀬, ??留먰닾濡??ㅻ벉怨? ?몃꽕?쇨퉴吏 留욎떠???⑸땲?? BlogDraft????諛섎났 ?묒뾽??以꾩씠怨??ъ슜?먭? 理쒖쥌 ?몄쭛??吏묒쨷?섎룄濡??뺤뒿?덈떎.</p>
        </PolicySection>
        <PolicySection title="?⑥닚 AI ?먮룞 ?앹꽦湲곗???李⑥씠">
          <p>BlogDraft???꾩꽦蹂몄쓣 ???諛쒗뻾?섎뒗 ?꾧뎄媛 ?꾨땲???섏젙 媛?ν븳 珥덉븞??留뚮뱶???꾧뎄?낅땲?? PDF瑜??듯빐 ??湲 ?ㅽ??쇱쓣 李멸퀬?섍퀬, ?ъ쭊 ?먮쫫??留욎떠 蹂몃Ц 援ъ꽦???쒖븞?섎ŉ, 吏곸젒 留뚮뱺 ?먮굦???몃꽕???몄쭛???④퍡 ?쒓났?⑸땲??</p>
        </PolicySection>
        <PolicySection title="?ъ슜???섏젙 ?먯튃">
          <p>AI 珥덉븞 ???ъ슜?먭? ?ㅼ젣 寃쏀뿕, ?ъ떎 ?뺤씤, 留먰닾 ?섏젙, ?쒕ぉ怨??몃꽕??臾멸뎄 議곗젙???뷀빐 諛쒗뻾 以鍮꾨? 留덈Т由ы븯??寃껋쓣 ?먯튃?쇰줈 ?⑸땲??</p>
        </PolicySection>
        <PolicySection title="?쒕퉬?ㅺ? 蹂댁옣?섏? ?딅뒗 ?ы빆">
          <p>AI 寃곌낵???뺥솗?? 寃???몄텧, ?섏씡, ?뱀젙 ?뚮옯?쇱쓽 ?뱀씤 ?щ?瑜?蹂댁옣?섏? ?딆뒿?덈떎. 理쒖쥌 諛쒗뻾 ???ъ슜?먭? ?ъ떎 ?뺣낫? 沅뚮━ 臾몄젣瑜??뺤씤?댁빞 ?⑸땲??</p>
        </PolicySection>
        <PolicySection title="?댁쁺??諛?臾몄쓽">
          <ContactInfoBox />
          <p>
            ?먯꽭??臾몄쓽??<Link to="/contact" className="font-bold text-blue-700 hover:underline">臾몄쓽?섍린 ?섏씠吏</Link>瑜??댁슜??二쇱꽭??
          </p>
        </PolicySection>
      </PolicyLayout>
    </>
  );
}

function NotFoundPage() {
  const location = useLocation();

  return (
    <>
      <SEO
        title={pageSeo.notFound.title}
        description={pageSeo.notFound.description}
        path={location.pathname || "/404"}
        noindex
      />
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <PolicyLayout title="?섏씠吏瑜?李얠쓣 ???놁뒿?덈떎" description="?낅젰??二쇱냼媛 蹂寃쎈릺?덇굅??議댁옱?섏? ?딅뒗 ?섏씠吏?낅땲??">
        <InfoBox>
          <p>?꾨옒 愿???덈궡 ?섏씠吏濡??대룞?섍굅???덉쑝濡??뚯븘媛 BlogDraft瑜?怨꾩냽 ?댁슜??二쇱꽭??</p>
        </InfoBox>
      </PolicyLayout>
    </>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-slate-500 sm:px-6 lg:px-8">
        <p>BlogDraft. 珥덉븞? 鍮좊Ⅴ寃? ?꾩꽦? ?섎떟寃?</p>
        <nav className="flex gap-4">
          <Link to="/guide" className="hover:text-blue-700">釉붾줈洹??묒꽦 媛?대뱶</Link>
          <Link to="/privacy" className="hover:text-blue-700">媛쒖씤?뺣낫 泥섎━諛⑹묠</Link>
          <Link to="/about" className="hover:text-blue-700">?쒕퉬???뚭컻</Link>
        </nav>
      </div>
    </footer>
  );
}

function PolicyFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 text-xs text-slate-500 sm:px-6 lg:grid-cols-[1fr_2fr] lg:px-8">
        <p>BlogDraft. 珥덉븞? 鍮좊Ⅴ寃? ?꾩꽦? ?щ엺?듦쾶</p>
        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:justify-items-end">
          <Link to="/guide" className="hover:text-blue-700">釉붾줈洹??묒꽦 媛?대뱶</Link>
          {policyLinks.map((link) => (
            <Link key={link.to} to={link.to} className="hover:text-blue-700">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/guide" element={<GuideIndexPage />} />
          <Route path="/guide/:slug" element={<GuideArticleDetailPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/copyright" element={<CopyrightPage />} />
          <Route path="/ai-policy" element={<AiPolicyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <PolicyFooter />
      </div>
    </BrowserRouter>
  );
}
