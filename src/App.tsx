import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Route, Routes, useParams } from "react-router-dom";
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
import { FooterAdSlot } from "./components/ads/FooterAdSlot";
import { FormState, ThumbnailData } from "./types";

const DRAFT_STORAGE_KEY = "blogdraft_local_draft_v2";
const RESULT_STORAGE_KEY = "blogdraft_generation_result_v2";
const VERCEL_SAFE_TOTAL_BYTES = 3.8 * 1024 * 1024;

function formatUploadBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
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
  userApiKey: "",
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

  const getTodayKey = () => {
    const d = new Date();
    return `blogdraft_daily_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
  };

  useEffect(() => {
    try {
      const storedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (storedDraft) {
        const parsed = JSON.parse(storedDraft);
        setFormState((prev) => ({
          ...prev,
          tone: parsed.tone || prev.tone,
          styleLevel: parsed.styleLevel || prev.styleLevel,
          userRequest: parsed.userRequest || "",
          userApiKey: parsed.userApiKey || "",
          privacyConsent: Boolean(parsed.privacyConsent),
        }));
      }

      const storedResult = localStorage.getItem(RESULT_STORAGE_KEY);
      if (storedResult) {
        const parsed = JSON.parse(storedResult);
        setBlogContent(parsed.blogContent || "");
        setThumbnailData(parsed.thumbnailData || initialThumbnailData);
        setPdfBriefing(parsed.pdfBriefing || "");
      }

      const used = localStorage.getItem(getTodayKey());
      setTodayUsedCount(used ? parseInt(used, 10) || 0 : 0);
    } catch (error) {
      console.error("Failed to load saved draft:", error);
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
          userApiKey: formState.userApiKey,
          privacyConsent: formState.privacyConsent,
        })
      );
    } catch (error) {
      console.error("Failed to save draft:", error);
    }
  }, [formState.tone, formState.styleLevel, formState.userRequest, formState.userApiKey, formState.privacyConsent]);

  useEffect(() => {
    try {
      localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify({ blogContent, thumbnailData, pdfBriefing }));
    } catch (error) {
      console.error("Failed to save result:", error);
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

  const hasCustomKey = formState.userApiKey.trim().length > 0;
  const usesRemaining = hasCustomKey ? 999 : Math.max(0, 3 - todayUsedCount);
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
  };

  const handleSubmit = () => {
    if (!formState.privacyConsent) {
      setErrorMessage("AI 초안 생성을 위해 입력 자료 처리 안내에 동의해 주세요.");
      return;
    }

    if (!hasCustomKey && usesRemaining <= 0) {
      setErrorMessage("오늘의 공용 API 무료 생성 횟수를 모두 사용했습니다. 개인 Gemini API Key를 입력하면 계속 사용할 수 있습니다.");
      return;
    }

    if (formState.photos.length === 0 && !confirm("사진 없이 글 초안만 생성할까요? 사진을 추가하면 글 흐름과 썸네일 제안이 더 자연스러워집니다.")) {
      return;
    }

    performGenerate();
  };

  const performGenerate = async () => {
    try {
      setIsGenerating(true);
      setErrorMessage(null);

      const formData = new FormData();
      const uploadBytes = getUploadBytes(formState);
      if (uploadBytes > VERCEL_SAFE_TOTAL_BYTES) {
        throw new Error(`Vercel 배포 환경의 업로드 제한을 넘었습니다. 현재 ${formatUploadBytes(uploadBytes)}이며, ${formatUploadBytes(VERCEL_SAFE_TOTAL_BYTES)} 이하로 줄여 주세요.`);
      }
      formState.photos.forEach((photo) => formData.append("photos", photo.file));
      if (formState.pdfFile) formData.append("pdf", formState.pdfFile);
      if (formState.referenceThumbnailFile) formData.append("referenceThumbnail", formState.referenceThumbnailFile);
      formData.append("tone", formState.tone);
      formData.append("styleLevel", formState.styleLevel.toString());
      formData.append("userRequest", formState.userRequest);
      formData.append("thumbnailIndex", formState.thumbnailIndex.toString());
      if (hasCustomKey) formData.append("userApiKey", formState.userApiKey.trim());

      const res = await fetch("/api/generate", { method: "POST", body: formData });
      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        if (res.status === 413) {
          throw new Error("업로드 용량이 Vercel 함수 제한을 넘었습니다. 사진 수를 줄이거나 PDF를 더 작은 파일로 올려 주세요.");
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
      setIsGenerating(false);
    }
  };

  const handleRecommendThumbnail = async () => {
    const formData = new FormData();
    if (selectedPhoto) formData.append("photo", selectedPhoto.file);
    if (formState.referenceThumbnailFile) formData.append("referenceThumbnail", formState.referenceThumbnailFile);
    formData.append("blogContent", blogContent);
    formData.append("userRequest", formState.userRequest);
    if (hasCustomKey) formData.append("userApiKey", formState.userApiKey.trim());

    const res = await fetch("/api/recommend-thumbnail", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "썸네일 문구 재추천 중 오류가 발생했습니다.");
    }
    setThumbnailData(data.thumbnailData || initialThumbnailData);
  };

  return (
    <>
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

          <div className="lg:col-span-5">
            <InputForm
              formState={formState}
              setFormState={setFormState}
              onSubmit={handleSubmit}
              isGenerating={isGenerating}
              pdfBriefing={pdfBriefing}
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

function GuidePage() {
  const guides = useMemo(() => guideArticles, []);

  return (
    <>
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">BlogDraft Guide</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">블로그 작성 가이드</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            AI가 만든 일반적인 문장만으로는 글의 개성과 신뢰성이 부족할 수 있습니다. 실제 사진, 구체적인 경험, 사용자의 말투를 더해 발행 전 최종 점검까지 이어가세요.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {guides.map((guide) => (
            <Link to={`/guide/${guide.slug}`} id={guide.slug} key={guide.title} className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-sm">
              <h2 className="text-base font-black text-slate-950">{guide.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{guide.body[0]}</p>
              <span className="mt-4 inline-block text-xs font-black text-blue-700">자세히 보기</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}

function GuideArticlePage() {
  const { slug } = useParams();
  const article = guideArticles.find((guide) => guide.slug === slug) || guideArticles[0];

  return (
    <>
      <Header onReset={() => undefined} isGenerating={false} hasCustomKey={false} usesRemaining={3} />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Link to="/guide" className="text-xs font-black text-blue-700 hover:underline">블로그 작성 가이드로 돌아가기</Link>
        <article className="mt-5 rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">BlogDraft Guide</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950">{article.title}</h1>
          <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
            {article.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-7 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-slate-700">
            AI는 초안을 만들고, 마지막 완성은 사용자가 합니다. 실제 경험과 정확한 정보를 더해 내 블로그다운 글로 다듬어 주세요.
          </div>
        </article>
      </main>
    </>
  );
}

function StaticPage({ title, children }: { title: string; children: React.ReactNode }) {
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

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/guide/:slug" element={<GuideArticlePage />} />
          <Route path="/privacy" element={<StaticPage title="개인정보 처리방침"><p>BlogDraft는 사용자가 업로드한 사진, PDF, 요청사항을 AI 초안 생성을 위해 처리합니다. 개인 API Key는 서버 로그에 저장하지 않으며, 브라우저 자동 저장 데이터는 사용자의 기기 localStorage에 보존됩니다.</p><p>발행 전 사실 확인과 최종 편집 책임은 사용자에게 있습니다.</p></StaticPage>} />
          <Route path="/about" element={<StaticPage title="서비스 소개"><p>BlogDraft는 사진과 기존 글을 바탕으로 내 말투에 가까운 블로그 초안을 만들고, 직접 만든 느낌의 썸네일까지 편집할 수 있는 AI 블로그 제작 도구입니다.</p><p>완전 자동화보다 글 작성 시간 단축, 사용자의 말투와 경험 유지, 글과 썸네일의 직접 수정을 핵심 가치로 둡니다.</p></StaticPage>} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
