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
const RESULT_STORAGE_KEY = "blogdraft_generation_result_v2";
const OPENAI_KEY_STORAGE_KEY = "blogdraft_openai_api_key_v1";
const GEMINI_KEY_STORAGE_KEY = "blogdraft_gemini_api_key_v1";
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
    title: "BlogDraft | AI 블로그 초안과 썸네일 작성 도구",
    description: "사진과 참고자료를 바탕으로 블로그 초안을 만들고, 내 말투와 경험을 더해 썸네일까지 다듬는 BlogDraft 도구입니다.",
  },
  guide: {
    title: "블로그 작성 가이드 | BlogDraft",
    description: "AI 초안을 내 경험과 말투로 다듬고, 사진과 썸네일까지 자연스럽게 완성하는 블로그 작성 가이드입니다.",
  },
  about: {
    title: "서비스 소개 | BlogDraft",
    description: "BlogDraft가 사진, 참고자료, 말투 분석을 바탕으로 수정 가능한 블로그 초안과 썸네일 편집을 돕는 방식을 소개합니다.",
  },
  privacy: {
    title: "개인정보처리방침 | BlogDraft",
    description: "BlogDraft 이용 과정에서 처리될 수 있는 입력 자료, 업로드 파일, 개인 API Key와 브라우저 저장 데이터 처리 기준을 안내합니다.",
  },
  terms: {
    title: "이용약관 | BlogDraft",
    description: "BlogDraft 서비스 이용 조건, AI 결과물의 성격, 금지행위와 사용자의 최종 발행 책임을 안내합니다.",
  },
  contact: {
    title: "문의하기 | BlogDraft",
    description: "BlogDraft 서비스 오류, 개인정보, 저작권 침해 신고, 제휴와 기능 개선 제안을 문의하는 방법을 안내합니다.",
  },
  copyright: {
    title: "콘텐츠 및 저작권 안내 | BlogDraft",
    description: "BlogDraft에서 사진, PDF, 글과 AI 결과물을 사용할 때 확인해야 할 저작권, 초상권, 개인정보 기준을 안내합니다.",
  },
  aiPolicy: {
    title: "AI 생성 결과 이용 안내 | BlogDraft",
    description: "AI는 초안을 만들고 마지막 완성은 사용자가 한다는 BlogDraft의 AI 결과물 이용 원칙과 편집 기준을 안내합니다.",
  },
  notFound: {
    title: "페이지를 찾을 수 없습니다 | BlogDraft",
    description: "요청한 BlogDraft 페이지를 찾을 수 없습니다. 홈 또는 가이드 목록에서 필요한 페이지를 다시 찾아보세요.",
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
    datePublished: article.publishedAt.includes("입력 필요") ? undefined : article.publishedAt,
    dateModified: article.updatedAt.includes("입력 필요") ? undefined : article.updatedAt,
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
  tone: "친근한 존댓말",
  styleLevel: 3,
  userRequest: "",
  thumbnailIndex: 0,
  aiProvider: "openai",
  openaiApiKey: "",
  geminiApiKey: "",
  rememberOpenaiApiKey: false,
  rememberGeminiApiKey: false,
  privacyConsent: false,
};

const initialThumbnailData: ThumbnailData = {
  thumbnail_main_text: "오늘의 기록",
  thumbnail_sub_text: "내 경험을 더해 완성하는 글",
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
    title: "내 말투를 참고한 글 작성",
    body: "기존 블로그 글이나 참고 PDF의 문장 길이, 말투, 단락 구성과 표현 방식을 참고합니다.",
  },
  {
    icon: LayoutList,
    title: "사진에 맞는 자연스러운 글 구성",
    body: "업로드한 사진을 분석해 글의 흐름에 어울리는 위치와 순서를 제안합니다.",
  },
  {
    icon: ImageIcon,
    title: "내가 만든 느낌의 썸네일",
    body: "대표 사진과 글의 분위기를 바탕으로 썸네일 문구와 구성을 함께 제안합니다.",
  },
  {
    icon: CheckCircle2,
    title: "발행 전 직접 수정 가능",
    body: "완성본이 아니라 수정하기 쉬운 초안으로 제공해 사용자가 직접 다듬을 수 있습니다.",
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
        const migratedGeminiKey = typeof (parsed as any).userApiKey === "string" ? (parsed as any).userApiKey : "";
        setFormState((prev) => ({
          ...prev,
          tone: parsed.tone || prev.tone,
          styleLevel: parsed.styleLevel || prev.styleLevel,
          userRequest: parsed.userRequest || "",
          aiProvider: parsed.aiProvider === "gemini" ? "gemini" : "openai",
          openaiApiKey: parsed.rememberOpenaiApiKey ? localStorage.getItem(OPENAI_KEY_STORAGE_KEY) || "" : "",
          geminiApiKey: parsed.rememberGeminiApiKey ? localStorage.getItem(GEMINI_KEY_STORAGE_KEY) || migratedGeminiKey : migratedGeminiKey,
          rememberOpenaiApiKey: Boolean(parsed.rememberOpenaiApiKey),
          rememberGeminiApiKey: Boolean(parsed.rememberGeminiApiKey || migratedGeminiKey),
          privacyConsent: Boolean(parsed.privacyConsent),
        }));
        if (migratedGeminiKey) {
          setErrorMessage("기존에 저장된 API Key는 Gemini API Key로 옮겨졌습니다. 공용 기기라면 저장 여부를 확인해 주세요.");
        }
      }

      const parsedResult = readStorageJson<{
        blogContent?: string;
        thumbnailData?: ThumbnailData;
        pdfBriefing?: string;
      }>(RESULT_STORAGE_KEY);
      if (parsedResult) {
        setBlogContent(parsedResult.blogContent || "");
        setThumbnailData(parsedResult.thumbnailData || initialThumbnailData);
        setPdfBriefing(parsedResult.pdfBriefing || "");
      }

      const used = localStorage.getItem(getTodayKey());
      setTodayUsedCount(used ? parseInt(used, 10) || 0 : 0);
    } catch {
      setErrorMessage("저장된 임시 데이터 일부를 불러오지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.");
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          tone: formState.tone,
          styleLevel: formState.styleLevel,
          userRequest: formState.userRequest,
          aiProvider: formState.aiProvider,
          rememberOpenaiApiKey: formState.rememberOpenaiApiKey,
          rememberGeminiApiKey: formState.rememberGeminiApiKey,
          privacyConsent: formState.privacyConsent,
        })
      );
      if (formState.rememberOpenaiApiKey && formState.openaiApiKey.trim()) {
        localStorage.setItem(OPENAI_KEY_STORAGE_KEY, formState.openaiApiKey.trim());
      } else {
        localStorage.removeItem(OPENAI_KEY_STORAGE_KEY);
      }
      if (formState.rememberGeminiApiKey && formState.geminiApiKey.trim()) {
        localStorage.setItem(GEMINI_KEY_STORAGE_KEY, formState.geminiApiKey.trim());
      } else {
        localStorage.removeItem(GEMINI_KEY_STORAGE_KEY);
      }
    } catch {
      setErrorMessage("임시 저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요.");
    }
  }, [
    formState.tone,
    formState.styleLevel,
    formState.userRequest,
    formState.aiProvider,
    formState.openaiApiKey,
    formState.geminiApiKey,
    formState.rememberOpenaiApiKey,
    formState.rememberGeminiApiKey,
    formState.privacyConsent,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify({ blogContent, thumbnailData, pdfBriefing }));
    } catch {
      setErrorMessage("생성 결과 임시 저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요.");
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

  const selectedProviderLabel = formState.aiProvider === "openai" ? "OpenAI" : "Gemini";
  const selectedApiKey = formState.aiProvider === "openai" ? formState.openaiApiKey.trim() : formState.geminiApiKey.trim();
  const hasCustomKey = selectedApiKey.length > 0;
  const usesRemaining = Math.max(0, 3 - todayUsedCount);
  const selectedPhoto = formState.photos[formState.thumbnailIndex] || formState.photos[0] || null;

  const handleReset = () => {
    if (!confirm("입력 내용과 생성 결과를 초기화할까요? 업로드한 사진은 다시 선택해야 합니다.")) return;
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
    localStorage.removeItem(RESULT_STORAGE_KEY);
    localStorage.removeItem(OPENAI_KEY_STORAGE_KEY);
    localStorage.removeItem(GEMINI_KEY_STORAGE_KEY);
  };

  const handleSubmit = () => {
    if (isGenerating) return;

    if (!formState.privacyConsent) {
      setErrorMessage("AI 초안 생성을 위해 입력 자료 처리 안내에 동의해 주세요.");
      return;
    }

    if (!hasCustomKey && usesRemaining <= 0) {
      setErrorMessage("오늘 제공되는 무료 생성 3회를 모두 사용했습니다. 계속 이용하려면 OpenAI 또는 Gemini를 선택하고 개인 API Key를 입력해 주세요.");
      return;
    }

    if (formState.photos.length === 0 && !confirm("사진 없이 글 초안만 생성할까요? 사진을 추가하면 글 흐름과 썸네일 제안이 더 자연스러워집니다.")) {
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
        throw new Error(`서버 업로드 제한을 넘었습니다. 현재 ${formatUploadBytes(uploadBytes)}이며, ${formatUploadBytes(SERVER_SAFE_TOTAL_BYTES)} 이하로 줄여 주세요.`);
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
          setUploadProgress(`임시 파일 업로드 ${index + 1}/${filesToUpload.length}: ${progress.percentage}%`);
        });
        temporaryBlobs.push(blob);
        if (item.kind === "photo") photoBlobs.push({ ...blob, order: item.order });
        if (item.kind === "pdf") pdfBlob = blob;
        if (item.kind === "reference-thumbnail") referenceThumbnailBlob = blob;
      }

      setUploadProgress(`${hasCustomKey ? `개인 ${selectedProviderLabel} API` : "무료 서버 API"}로 생성 요청 중`);
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
          aiProvider: formState.aiProvider,
          userApiKey: hasCustomKey ? selectedApiKey : undefined,
        }),
      });
      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        if (res.status === 413) {
          throw new Error("업로드 용량이 서버 요청 제한을 넘었습니다. 사진 수를 줄이거나 PDF를 더 작은 파일로 올려 주세요.");
        }
        throw new Error(`서버가 JSON 응답을 반환하지 않았습니다. HTTP ${res.status}`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "블로그 초안 생성 중 오류가 발생했습니다.");
      }

      setBlogContent(data.blogContent || "");
      setThumbnailData(data.thumbnailData || initialThumbnailData);
      setPdfBriefing(data.pdfBriefing || "");
      if (!hasCustomKey) {
        const nextCount = todayUsedCount + 1;
        setTodayUsedCount(nextCount);
        localStorage.setItem(getTodayKey(), nextCount.toString());
      }
      setActiveTab("blog");
    } catch (err: any) {
      setErrorMessage(err?.message || "서버 통신 중 오류가 발생했습니다.");
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
          aiProvider: formState.aiProvider,
          userApiKey: hasCustomKey ? selectedApiKey : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "썸네일 문구 재추천 중 오류가 발생했습니다.");
      }
      setThumbnailData(data.thumbnailData || initialThumbnailData);
    } catch (err: any) {
      setErrorMessage(err?.message || "썸네일 문구 재추천 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
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
                  글은 내 말투처럼, 썸네일은 내가 만든 것처럼
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600">
                  사진과 기존 글을 참고해 블로그 초안을 만들고, 내 취향에 맞는 썸네일까지 함께 완성해 보세요.
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
                  <h2 className="text-sm font-black text-slate-950">AI는 초안을 만들고, 마지막 완성은 사용자가 합니다.</h2>
                  <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-700">
                    <li>AI가 작성한 글을 그대로 발행하기보다 실제 경험과 정보를 추가해 주세요.</li>
                    <li>장소, 가격, 제품 정보처럼 변할 수 있는 내용은 발행 전에 다시 확인해 주세요.</li>
                    <li>일률적인 AI 문장보다 자신의 경험과 말투를 반영한 글이 더 자연스럽게 전달될 수 있습니다.</li>
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
                  <strong className="block font-bold">안내 메시지</strong>
                  <span>{errorMessage}</span>
                </div>
                <button type="button" onClick={() => setErrorMessage(null)} className="text-xs font-bold text-red-500 hover:text-red-700">
                  닫기
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
                    블로그 글 미리보기
                  </button>
                  <button type="button" onClick={() => setActiveTab("thumbnail")} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${activeTab === "thumbnail" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    <ImageIcon className="h-4 w-4" />
                    썸네일 편집
                  </button>
                </div>
                <span className="text-xs text-slate-500">글과 썸네일을 한 공간에서 수정하고 발행 준비를 마무리하세요.</span>
              </div>

              {isGenerating ? (
                <div className="my-4 rounded-lg border border-blue-100 bg-blue-50 p-12 text-center">
                  <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
                  <h3 className="text-sm font-black text-slate-900">내 말투에 가까운 초안과 썸네일 문구를 정리하는 중입니다.</h3>
                  <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-600">AI가 대신 완성하는 단계가 아니라, 사용자가 다듬기 쉬운 첫 초안을 준비하는 단계입니다.</p>
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
    body: ["AI 초안은 빠르게 구조를 잡아주는 출발점입니다. 발행 전에는 실제 경험, 확인 가능한 정보, 내 말투에 맞지 않는 문장을 먼저 살펴보는 것이 좋습니다.", "가격, 위치, 운영시간, 제품 정보처럼 바뀔 수 있는 내용은 공식 페이지나 현장 정보로 다시 확인하세요.", "마지막으로 제목과 썸네일 문구가 본문 내용과 맞는지 확인하면 독자가 기대한 내용과 실제 글의 차이를 줄일 수 있습니다."],
  },
  {
    slug: "add-personal-experience",
    title: "AI 블로그 글에 내 경험을 자연스럽게 추가하는 방법",
    body: ["가장 쉬운 방법은 AI가 만든 문단 사이에 내가 직접 보고 느낀 장면을 한두 문장씩 넣는 것입니다.", "예를 들어 맛, 분위기, 대기 시간, 직원 응대, 재방문 의사처럼 AI가 대신 알 수 없는 내용을 추가하면 글이 더 구체적이 됩니다.", "일반적인 장점 나열보다 내가 왜 그렇게 느꼈는지 짧게 덧붙이는 편이 독자에게 자연스럽게 전달됩니다."],
  },
  {
    slug: "keep-my-tone",
    title: "내 말투를 유지하면서 AI를 활용하는 방법",
    body: ["자주 쓰는 문장 끝맺음, 이모지 사용 방식, 소제목 길이, 문단 호흡을 정해 두면 AI 초안을 고치기 쉬워집니다.", "기존 글 PDF를 참고자료로 넣을 때는 문장을 복사하기보다 분위기와 구조만 참고하도록 사용하는 것이 좋습니다.", "초안이 너무 반듯하게 느껴지면 평소 내가 쓰는 표현으로 한 문단씩 다시 바꿔 보세요."],
  },
  {
    slug: "ai-like-sentences",
    title: "AI가 쓴 것처럼 보이는 문장의 공통점",
    body: ["너무 넓은 칭찬, 근거 없는 단정, 반복되는 형용사는 AI 문장처럼 느껴질 수 있습니다.", "특히 직접 겪은 내용 없이 '정말 만족스러웠습니다' 같은 문장이 반복되면 글의 신뢰감이 약해질 수 있습니다.", "구체적인 장면, 숫자 확인, 나만의 기준을 더하면 문장이 덜 일률적으로 보입니다."],
  },
  {
    slug: "many-photos-flow",
    title: "사진이 많은 블로그 글을 자연스럽게 구성하는 방법",
    body: ["사진이 많을수록 업로드 순서보다 독자가 이해할 순서를 먼저 생각하는 것이 좋습니다.", "입구, 메뉴판, 대표 장면, 디테일, 결과 순으로 묶으면 글의 흐름이 안정됩니다.", "비슷한 사진은 그리드로 묶고 과정이 있는 사진은 슬라이드처럼 이어 보여주면 본문이 덜 끊깁니다."],
  },
  {
    slug: "good-title-vs-clickbait",
    title: "클릭만 노린 제목과 좋은 제목의 차이",
    body: ["좋은 제목은 궁금증을 만들되 본문이 실제로 답할 수 있는 범위 안에 있어야 합니다.", "과장된 표현이나 사실과 다른 약속은 클릭은 만들 수 있어도 글의 신뢰를 떨어뜨릴 수 있습니다.", "장소, 제품, 상황, 핵심 경험을 짧게 드러내면 독자가 필요한 글인지 빠르게 판단할 수 있습니다."],
  },
  {
    slug: "short-thumbnail-copy",
    title: "썸네일 문구를 짧고 자연스럽게 만드는 방법",
    body: ["썸네일 문구는 한눈에 읽히는 것이 중요합니다. 메인 문구는 짧게, 보조 문구는 본문 맥락을 조금만 보완하는 정도가 좋습니다.", "본문과 다른 강한 표현을 쓰기보다 사진과 글의 핵심을 자연스럽게 압축하세요.", "저장 전 모바일 화면에서 글자가 너무 작거나 사진을 가리지 않는지 확인하는 습관이 도움이 됩니다."],
  },
  {
    slug: "avoid-ad-like-thumbnail",
    title: "블로그 썸네일이 지나치게 광고처럼 보이지 않게 만드는 방법",
    body: ["큰 느낌표, 과도한 대비, 너무 많은 문구는 광고 이미지처럼 보일 수 있습니다.", "사진의 분위기를 살리고 여백을 남기면 직접 만든 듯한 자연스러운 인상을 줄 수 있습니다.", "문구는 실제 본문 내용과 맞추고, 디자인은 읽기 쉬운 정도에서 멈추는 편이 좋습니다."],
  },
  {
    slug: "how-far-use-ai-tool",
    title: "AI 블로그 도구는 어디까지 활용하는 것이 좋을까?",
    body: ["AI는 초안, 구성 정리, 썸네일 문구 아이디어처럼 시간을 줄이는 작업에 잘 맞습니다.", "반대로 실제 판단, 경험, 사실 확인, 최종 발행 여부는 사용자가 맡아야 합니다.", "자동 생성보다 중요한 것은 내 사진, 내 기준, 내 표현이 글 안에 남아 있는지입니다."],
  },
  {
    slug: "final-checklist",
    title: "블로그 글 발행 전 최종 점검 체크리스트",
    body: ["발행 전에는 실제 경험 추가, 사실 정보 확인, 어색한 문장 수정, 사진 순서 점검, 반복 표현 정리를 확인하세요.", "제목과 썸네일 문구가 실제 내용과 일치하는지도 중요합니다.", "마지막으로 맞춤법과 오탈자를 확인하면 초안이 내 글에 가까운 완성본으로 다듬어집니다."],
  },
  {
    slug: "restaurant-review-must-add",
    title: "맛집 후기 글에 반드시 직접 추가해야 하는 내용",
    body: ["맛집 후기는 AI가 대신 알 수 없는 현장감이 중요합니다. 방문 시간, 대기 여부, 실제 주문 메뉴, 맛의 기준, 양, 가격 체감 등을 직접 추가하세요.", "주차, 예약, 좌석 간격, 혼잡도처럼 방문자가 궁금해할 내용도 도움이 됩니다.", "다만 운영시간과 가격은 바뀔 수 있으므로 발행 전에 다시 확인하는 편이 좋습니다."],
  },
  {
    slug: "product-review-human-judgment",
    title: "제품 리뷰에서 AI가 대신 판단하면 안 되는 내용",
    body: ["제품 리뷰에서 만족도, 내구성, 사용감, 재구매 의사는 실제 사용자의 판단이 들어가야 합니다.", "AI가 일반적인 장단점을 정리할 수는 있지만 내가 사용한 환경과 기준은 직접 써야 합니다.", "스펙, 가격, 구성품, 보증 조건은 판매처나 제조사 정보를 확인한 뒤 반영하세요."],
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
  publishedAt: "[작성일 입력 필요]",
  updatedAt: "[업데이트일 입력 필요]",
};

const defaultGuideMeta: Omit<GuideArticleData, "slug" | "title" | "summary" | "body" | "content"> = {
  category: "AI 글쓰기",
  publishedAt: datePlaceholders.publishedAt,
  updatedAt: datePlaceholders.updatedAt,
  readingTime: "3분",
  relatedSlugs: [],
};

const guideMeta: Record<string, Omit<GuideArticleData, "slug" | "title" | "summary" | "body" | "content">> = {
  "before-publishing-ai-draft": {
    category: "발행 전 점검",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "6분",
    relatedSlugs: ["add-personal-experience", "keep-my-tone", "final-checklist"],
  },
  "add-personal-experience": {
    category: "AI 글쓰기",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "5분",
    relatedSlugs: ["before-publishing-ai-draft", "keep-my-tone", "many-photos-flow"],
  },
  "keep-my-tone": {
    category: "말투 편집",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "7분",
    relatedSlugs: ["before-publishing-ai-draft", "add-personal-experience", "ai-like-sentences"],
  },
  "ai-like-sentences": {
    category: "말투 편집",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "3분",
    relatedSlugs: ["keep-my-tone", "add-personal-experience", "final-checklist"],
  },
  "many-photos-flow": {
    category: "사진 활용",
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
    category: "AI 글쓰기",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "3분",
    relatedSlugs: ["before-publishing-ai-draft", "add-personal-experience", "keep-my-tone"],
  },
  "final-checklist": {
    category: "발행 전 점검",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "3분",
    relatedSlugs: ["before-publishing-ai-draft", "add-personal-experience", "keep-my-tone"],
  },
  "restaurant-review-must-add": {
    category: "AI 글쓰기",
    publishedAt: datePlaceholders.publishedAt,
    updatedAt: datePlaceholders.updatedAt,
    readingTime: "3분",
    relatedSlugs: ["add-personal-experience", "many-photos-flow", "before-publishing-ai-draft"],
  },
  "product-review-human-judgment": {
    category: "AI 글쓰기",
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
  const categories = useMemo(() => ["전체", ...Array.from(new Set(guides.map((guide) => guide.category)))], [guides]);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const filteredGuides = selectedCategory === "전체" ? guides : guides.filter((guide) => guide.category === selectedCategory);

  return (
    <>
      <SEO
        title={pageSeo.guide.title}
        description={pageSeo.guide.description}
        path="/guide"
        structuredData={webPageJsonLd("CollectionPage", "블로그 작성 가이드", pageSeo.guide.description, "/guide")}
      />
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">BlogDraft Guide</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">블로그 작성 가이드</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            AI 초안을 내 경험과 말투로 다듬고, 사진과 썸네일까지 자연스럽게 완성하는 방법을 정리했습니다.
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
                <span>업데이트 {guide.updatedAt}</span>
              </div>
              <Link to={`/guide/${guide.slug}`} className="mt-4 inline-block text-xs font-black text-blue-700 hover:underline">자세히 보기</Link>
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
        <h1 className="mt-3 text-3xl font-black text-slate-950">가이드를 찾을 수 없습니다</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          주소가 바뀌었거나 존재하지 않는 가이드입니다. 가이드 목록에서 다른 글을 확인해 주세요.
        </p>
        <Link to="/guide" className="mt-6 inline-block text-sm font-black text-blue-700 hover:underline">
          가이드 목록으로 돌아가기
        </Link>
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
        structuredData={webPageJsonLd("WebPage", "개인정보처리방침", pageSeo.privacy.description, "/privacy")}
      />
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <PolicyLayout title="개인정보처리방침" description="BlogDraft 이용 과정에서 처리될 수 있는 정보와 보관 방식, 이용자의 권리를 안내합니다.">
        <PolicySection title="1. 개인정보처리방침 개요">
          <p>BlogDraft는 사진, 참고자료, 사용자 요청을 바탕으로 수정 가능한 블로그 초안과 썸네일 문구 작성을 돕는 서비스입니다. 사용자가 입력하거나 업로드한 자료는 초안 생성, 사진 흐름 분석, 썸네일 문구 추천, 오류 확인과 서비스 안정화를 위해 필요한 범위에서 처리됩니다.</p>
        </PolicySection>

        <PolicySection title="2. 처리할 수 있는 정보">
          <h3 className="font-black text-slate-950">사용자가 직접 입력하거나 업로드하는 정보</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>블로그 작성 요청사항, 말투 및 스타일 설정</li>
            <li>업로드한 사진, 참고용 PDF, 참고용 썸네일 이미지</li>
            <li>사용자가 직접 입력한 OpenAI API Key 또는 Gemini API Key</li>
          </ul>
          <h3 className="font-black text-slate-950">서비스 이용 과정에서 생성될 수 있는 정보</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>접속 일시, 오류 기록, 브라우저 및 기기 관련 기본 정보</li>
            <li>서비스 이용 횟수</li>
            <li>브라우저 localStorage에 저장되는 초안, 설정값, 사용자가 기억하기를 선택한 개인 API Key</li>
          </ul>
        </PolicySection>

        <PolicySection title="3. 이용 목적">
          <ul className="list-disc space-y-1 pl-5">
            <li>블로그 초안 생성과 사진 흐름 및 썸네일 문구 추천</li>
            <li>사용자가 설정한 말투, 스타일, 요청사항 반영</li>
            <li>서비스 오류 확인 및 기능 안정화</li>
            <li>사용자 설정과 작성 중 결과 보존</li>
          </ul>
        </PolicySection>

        <PolicySection title="4. 업로드 자료 처리">
          <p>사진과 PDF는 AI 초안 생성을 위해 사용자가 선택한 외부 AI 서비스로 전송될 수 있으며, 현재 선택 가능한 외부 AI 서비스는 OpenAI API와 Google Gemini API입니다. 사용자는 업로드 전 타인의 개인정보, 얼굴, 주소, 연락처, 민감한 문서가 포함되어 있지 않은지 확인해야 합니다.</p>
          <p>현재 서버 코드는 multer의 memoryStorage를 사용하며, 요청 처리 후 업로드 파일을 서버 디스크에 별도 파일로 영구 저장하지 않습니다. 다만 외부 AI 제공자의 처리 방식은 해당 제공자의 정책이 적용될 수 있습니다.</p>
        </PolicySection>

        <PolicySection title="5. 개인 API Key 처리">
          <p>개인 OpenAI API Key 또는 Gemini API Key는 사용자가 선택한 제공자의 AI 요청을 처리하기 위해서만 사용됩니다. 한 제공자의 키를 다른 제공자 요청에 사용하지 않으며, 서버 콘솔이나 로그에 API Key를 출력하지 않습니다.</p>
          <p>개인 API Key는 기본적으로 현재 브라우저 세션에서만 유지됩니다. 사용자가 “이 기기에 API Key 기억하기”를 직접 선택한 경우에만 해당 기기의 localStorage에 저장됩니다. 공용 PC에서는 개인 API Key를 저장하지 않는 것이 좋으며, 저장된 키 삭제 또는 사이트 초기화를 통해 브라우저 저장 데이터를 지울 수 있습니다.</p>
        </PolicySection>

        <PolicySection title="6. 보유 및 이용 기간">
          <ul className="list-disc space-y-1 pl-5">
            <li>브라우저 localStorage 데이터: 사용자가 직접 삭제하거나 사이트 초기화 기능을 사용할 때까지</li>
            <li>서버 요청 처리용 파일: 요청 처리가 끝난 후 별도 저장하지 않는 구조이므로 지속 보관하지 않음</li>
            <li>오류 로그: [오류 로그 보관 기간 결정 필요]</li>
            <li>문의 내역: [문의 내역 보관 기간 결정 필요]</li>
          </ul>
        </PolicySection>

        <PolicySection title="7. 제3자 서비스 및 국외 처리 가능성">
          <p>BlogDraft는 사용자가 선택한 제공자에 따라 OpenAI API 또는 Google Gemini API를 사용합니다. 사용자가 입력하거나 업로드한 자료가 OpenAI 또는 Google의 서버를 통해 처리될 수 있으며, 구체적인 처리 위치, 기간, 방식은 각 제공자의 정책이 적용될 수 있으므로 공식 정책을 함께 확인해야 합니다.</p>
          <InfoBox title="외부 정책 확인 위치">
            <p>OpenAI API, Google Gemini API 및 각 제공자의 개인정보 관련 공식 정책 링크 입력 또는 최신 공식 문서 연결 필요</p>
          </InfoBox>
        </PolicySection>

        <PolicySection title="8. 쿠키 및 광고 관련 안내">
          <p>현재 서비스는 Google AdSense 광고를 정식 운영하고 있지 않습니다. 향후 광고 서비스가 도입되면 Google 및 제3자 광고업체가 쿠키 등을 사용해 광고를 제공할 수 있으며, 관련 내용은 본 개인정보처리방침에 반영하고 별도로 안내합니다.</p>
        </PolicySection>

        <PolicySection title="9. 이용자의 권리">
          <ul className="list-disc space-y-1 pl-5">
            <li>브라우저 저장 데이터 삭제</li>
            <li>개인정보 관련 문의</li>
            <li>업로드 전 개인정보 제거</li>
            <li>개인 API Key 변경 또는 삭제</li>
            <li>서비스 이용 중단</li>
          </ul>
        </PolicySection>

        <PolicySection title="10. 안전조치">
          <ul className="list-disc space-y-1 pl-5">
            <li>API Key를 서버 로그로 출력하지 않음</li>
            <li>파일 크기 제한 적용</li>
            <li>업로드 허용 파일 형식 확인</li>
            <li>서버 디스크에 업로드 파일을 영구 저장하지 않는 구조</li>
          </ul>
        </PolicySection>

        <PolicySection title="11. 개인정보 관련 문의">
          <ContactInfoBox privacy />
        </PolicySection>

        <PolicySection title="12. 시행일 및 변경 안내">
          <p>시행일: [시행일 입력 필요]</p>
          <p>정책 변경 시 이 페이지에 변경 내용을 고지합니다.</p>
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
        structuredData={webPageJsonLd("WebPage", "이용약관", pageSeo.terms.description, "/terms")}
      />
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <PolicyLayout title="이용약관" description="BlogDraft를 이용할 때 지켜야 할 기본 조건과 AI 결과물 이용 책임을 안내합니다.">
        <PolicySection title="서비스 목적">
          <p>BlogDraft는 사진, 참고자료와 사용자 요청을 바탕으로 수정 가능한 블로그 초안과 썸네일 제작을 돕는 도구입니다.</p>
        </PolicySection>
        <PolicySection title="서비스 이용 조건">
          <ul className="list-disc space-y-1 pl-5">
            <li>사용자는 적법하게 사용할 권한이 있는 자료만 업로드해야 합니다.</li>
            <li>타인의 사진, 글, 개인정보와 저작물을 무단으로 업로드하거나 복제하면 안 됩니다.</li>
            <li>불법적이거나 타인의 권리를 침해하는 목적으로 이용해서는 안 됩니다.</li>
            <li>개인 API Key의 관리 책임은 사용자에게 있습니다.</li>
          </ul>
        </PolicySection>
        <PolicySection title="AI 결과물의 성격">
          <ul className="list-disc space-y-1 pl-5">
            <li>AI 결과는 참고용 초안이며 사실성, 정확성, 완전성, 검색 노출과 수익을 보장하지 않습니다.</li>
            <li>가격, 주소, 운영시간, 제품 사양 등은 사용자가 직접 검증해야 합니다.</li>
            <li>최종 편집과 발행 책임은 사용자에게 있습니다.</li>
          </ul>
        </PolicySection>
        <PolicySection title="서비스 제공과 변경">
          <p>외부 API 장애, 사용량 제한, 유지보수로 기능이 일시 중단될 수 있습니다. 기능과 사용 조건은 서비스 운영 과정에서 변경될 수 있으며, 중요한 변경은 사이트에서 안내합니다.</p>
        </PolicySection>
        <PolicySection title="금지행위">
          <ul className="list-disc space-y-1 pl-5">
            <li>타인의 API Key 무단 사용</li>
            <li>자동화된 과도한 반복 요청 또는 생성 제한 우회 시도</li>
            <li>서비스 안정성을 방해하는 행위</li>
            <li>불법 콘텐츠, 사칭, 명예훼손 콘텐츠 생성</li>
            <li>저작권이나 개인정보를 침해하는 자료 업로드</li>
          </ul>
        </PolicySection>
        <PolicySection title="책임 제한">
          <p>AI 결과의 오류로 인한 최종 책임은 사용자의 검토와 발행 여부에 따라 달라질 수 있습니다. 외부 AI 서비스나 네트워크 장애가 발생할 수 있으므로 서비스가 모든 결과를 보장할 수는 없습니다.</p>
        </PolicySection>
        <PolicySection title="이용약관 시행일">
          <p>[시행일 입력 필요]</p>
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
        structuredData={webPageJsonLd("ContactPage", "문의하기", pageSeo.contact.description, "/contact")}
      />
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <PolicyLayout title="문의하기" description="서비스 오류, 개인정보, 저작권, 제휴와 기능 개선 제안을 이메일로 문의할 수 있습니다.">
        <PolicySection title="문의 가능한 내용">
          <ul className="list-disc space-y-1 pl-5">
            <li>서비스 오류 문의</li>
            <li>개인정보 문의</li>
            <li>저작권 침해 신고</li>
            <li>제휴 및 광고 문의</li>
            <li>기능 개선 제안</li>
          </ul>
        </PolicySection>
        <PolicySection title="문의 방법">
          <p>현재 실제 전송 기능이 연결된 문의 폼은 제공하지 않습니다. 아래 이메일로 문의해 주세요.</p>
          <ContactInfoBox />
        </PolicySection>
        <PolicySection title="문의 시 함께 보내면 좋은 정보">
          <ul className="list-disc space-y-1 pl-5">
            <li>발생한 화면 또는 기능</li>
            <li>오류 메시지</li>
            <li>사용한 브라우저 및 기기</li>
            <li>문제 발생 시각</li>
          </ul>
          <InfoBox title="주의">
            <p>개인정보와 OpenAI 또는 Gemini API Key는 문의 내용에 포함하지 말아 주세요.</p>
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
        structuredData={webPageJsonLd("WebPage", "콘텐츠 및 저작권 안내", pageSeo.copyright.description, "/copyright")}
      />
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <PolicyLayout title="콘텐츠 및 저작권 안내" description="업로드 자료와 AI 결과물을 사용할 때 확인해야 할 저작권, 초상권, 개인정보 관련 기준입니다.">
        <PolicySection title="업로드 자료의 권리">
          <p>사용자가 업로드하는 사진, PDF와 글은 사용자가 적법하게 이용할 권리가 있어야 합니다. 타인의 블로그 글을 그대로 복제하기 위한 용도로 서비스를 사용하면 안 됩니다.</p>
        </PolicySection>
        <PolicySection title="참고 자료의 사용 방식">
          <p>참고 PDF는 말투, 문장 호흡, 구성과 분위기를 참고하는 목적으로 사용합니다. 특정 작성자의 문장을 그대로 복사하거나 모방하는 결과가 발견되면 사용자가 수정해야 합니다.</p>
        </PolicySection>
        <PolicySection title="발행 전 확인 사항">
          <ul className="list-disc space-y-1 pl-5">
            <li>AI 결과물에 제3자의 상표, 저작물 또는 개인정보가 포함되지 않았는지 확인</li>
            <li>썸네일에 사용하는 사진과 폰트의 이용 권한 확인</li>
            <li>타인의 얼굴, 주소, 연락처 등이 노출되지 않도록 수정</li>
          </ul>
        </PolicySection>
        <PolicySection title="저작권 침해 신고">
          <p>권리 침해가 의심되는 콘텐츠가 있다면 침해 대상, 권리자 정보, 확인 가능한 URL 또는 자료 설명을 포함해 문의해 주세요.</p>
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
        structuredData={webPageJsonLd("WebPage", "AI 생성 결과 이용 안내", pageSeo.aiPolicy.description, "/ai-policy")}
      />
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <PolicyLayout title="AI 생성 결과 이용 안내" description="AI는 초안을 만들고, 마지막 완성은 사용자가 합니다. BlogDraft가 지향하는 편집 원칙을 안내합니다.">
        <InfoBox title="핵심 원칙">
          <p>AI가 정리하고, 내가 완성합니다. 사용자의 사진, 경험과 판단이 콘텐츠의 핵심입니다.</p>
        </InfoBox>
        <PolicySection title="그대로 발행하기보다 직접 다듬기">
          <p>AI 결과는 빠른 출발점입니다. 그대로 발행하기보다는 실제 경험, 느낀 점, 직접 확인한 정보를 추가하는 것을 권장합니다.</p>
        </PolicySection>
        <PolicySection title="발행 전 확인할 것">
          <ul className="list-disc space-y-1 pl-5">
            <li>가격, 주소, 운영시간, 제품 사양 등 사실 정보 재확인</li>
            <li>내 말투에 맞지 않는 문장 수정</li>
            <li>과장된 제목이나 썸네일 문구 수정</li>
            <li>의료, 법률, 금융, 안전 등 중요한 정보는 전문가나 공식 자료 확인</li>
          </ul>
        </PolicySection>
        <PolicySection title="보장하지 않는 사항">
          <p>BlogDraft는 검색 노출, 블로그 지수와 수익을 보장하지 않습니다. 좋은 콘텐츠는 사용자의 실제 사진, 경험, 판단, 최종 편집을 통해 완성됩니다.</p>
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
        structuredData={webPageJsonLd("AboutPage", "서비스 소개", pageSeo.about.description, "/about")}
      />
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <PolicyLayout title="서비스 소개" description="글은 내 말투처럼, 썸네일은 내가 만든 것처럼. BlogDraft가 돕는 작업 방식입니다.">
        <InfoBox title="BlogDraft의 방향">
          <p>AI가 정리하고, 내가 완성합니다.</p>
        </InfoBox>
        <PolicySection title="서비스가 해결하려는 문제">
          <p>블로그 글을 쓰려면 사진을 고르고, 흐름을 잡고, 내 말투로 다듬고, 썸네일까지 맞춰야 합니다. BlogDraft는 이 반복 작업을 줄이고 사용자가 최종 편집에 집중하도록 돕습니다.</p>
        </PolicySection>
        <PolicySection title="단순 AI 자동 생성기와의 차이">
          <p>BlogDraft는 완성본을 대신 발행하는 도구가 아니라 수정 가능한 초안을 만드는 도구입니다. PDF를 통해 내 글 스타일을 참고하고, 사진 흐름에 맞춰 본문 구성을 제안하며, 직접 만든 느낌의 썸네일 편집을 함께 제공합니다.</p>
        </PolicySection>
        <PolicySection title="사용자 수정 원칙">
          <p>AI 초안 후 사용자가 실제 경험, 사실 확인, 말투 수정, 제목과 썸네일 문구 조정을 더해 발행 준비를 마무리하는 것을 원칙으로 합니다.</p>
        </PolicySection>
        <PolicySection title="서비스가 보장하지 않는 사항">
          <p>AI 결과의 정확성, 검색 노출, 수익, 특정 플랫폼의 승인 여부를 보장하지 않습니다. 최종 발행 전 사용자가 사실 정보와 권리 문제를 확인해야 합니다.</p>
        </PolicySection>
        <PolicySection title="운영자 및 문의">
          <ContactInfoBox />
          <p>
            자세한 문의는 <Link to="/contact" className="font-bold text-blue-700 hover:underline">문의하기 페이지</Link>를 이용해 주세요.
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
      <PolicyLayout title="페이지를 찾을 수 없습니다" description="입력한 주소가 변경되었거나 존재하지 않는 페이지입니다.">
        <InfoBox>
          <p>아래 관련 안내 페이지로 이동하거나 홈으로 돌아가 BlogDraft를 계속 이용해 주세요.</p>
        </InfoBox>
      </PolicyLayout>
    </>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-slate-500 sm:px-6 lg:px-8">
        <p>BlogDraft. 초안은 빠르게, 완성은 나답게.</p>
        <nav className="flex gap-4">
          <Link to="/guide" className="hover:text-blue-700">블로그 작성 가이드</Link>
          <Link to="/privacy" className="hover:text-blue-700">개인정보 처리방침</Link>
          <Link to="/about" className="hover:text-blue-700">서비스 소개</Link>
        </nav>
      </div>
    </footer>
  );
}

function PolicyFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 text-xs text-slate-500 sm:px-6 lg:grid-cols-[1fr_2fr] lg:px-8">
        <p>BlogDraft. 초안은 빠르게, 완성은 사람답게</p>
        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:justify-items-end">
          <Link to="/guide" className="hover:text-blue-700">블로그 작성 가이드</Link>
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
