import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { InputForm } from "./components/InputForm";
import { BlogPreview } from "./components/BlogPreview";
import { ThumbnailPreview } from "./components/ThumbnailPreview";
import { FormState, ThumbnailData } from "./types";
import { FileText, ImageIcon, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { FooterAdSlot } from "./components/ads/FooterAdSlot";
import { RewardAdModal } from "./components/ads/RewardAdModal";

export default function App() {
  const [formState, setFormState] = useState<FormState>({
    photos: [],
    pdfFile: null,
    pdfFileName: null,
    tone: "친근한 해요체",
    styleLevel: 3,
    userRequest: "",
    thumbnailIndex: 0,
    userApiKey: "",
    privacyConsent: false,
  });

  const [activeTab, setActiveTab] = useState<"blog" | "thumbnail">("blog");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRewardAdModal, setShowRewardAdModal] = useState(false);

  const [blogContent, setBlogContent] = useState<string>("");
  const [thumbnailData, setThumbnailData] = useState<ThumbnailData>({
    thumbnail_main_text: "오늘의 일상 & 정보 리뷰",
    thumbnail_sub_text: "한 눈에 확인하는 생생한 후기",
    layout_position: "CENTER",
  });

  // Track daily usages for public API Key users
  const [todayUsedCount, setTodayUsedCount] = useState<number>(0);

  const getTodayKey = () => {
    const d = new Date();
    return `blog_studio_daily_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
  };

  useEffect(() => {
    try {
      const key = getTodayKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        setTodayUsedCount(parseInt(stored, 10) || 0);
      }
    } catch (e) {
      console.error("Failed to load local daily count:", e);
    }
  }, []);

  const hasCustomKey = formState.userApiKey.trim().length > 0;
  const usesRemaining = hasCustomKey ? 999 : Math.max(0, 3 - todayUsedCount);

  // Reset Form and Results
  const handleReset = () => {
    if (confirm("모든 입력 내용과 생성된 결과를 초기화하시겠습니까?")) {
      setFormState({
        photos: [],
        pdfFile: null,
        pdfFileName: null,
        tone: "친근한 해요체",
        styleLevel: 3,
        userRequest: "",
        thumbnailIndex: 0,
        userApiKey: "",
        privacyConsent: false,
      });
      setBlogContent("");
      setThumbnailData({
        thumbnail_main_text: "오늘의 일상 & 정보 리뷰",
        thumbnail_sub_text: "한 눈에 확인하는 생생한 후기",
        layout_position: "CENTER",
      });
      setErrorMessage(null);
    }
  };

  // Gate: public API Key users must watch a rewarded ad before each generation
  const handleSubmit = () => {
    if (!hasCustomKey && usesRemaining <= 0) {
      setErrorMessage(
        "오늘의 공용 API 무료 이용 횟수(3회)를 모두 사용하셨습니다. 개인 Gemini API Key를 입력하시면 제한 없이 무제한 사용하실 수 있습니다."
      );
      return;
    }

    if (formState.photos.length === 0) {
      if (!confirm("업로드된 사진이 없습니다. 사진 없이 본문 작성을 진행하시겠습니까?")) {
        return;
      }
    }

    if (!hasCustomKey) {
      setShowRewardAdModal(true);
      return;
    }

    performGenerate();
  };

  // Submit to Backend API (/api/generate)
  const performGenerate = async () => {
    try {
      setIsGenerating(true);
      setErrorMessage(null);

      const formData = new FormData();

      // Append photos
      formState.photos.forEach((photoObj) => {
        formData.append("photos", photoObj.file);
      });

      // Append PDF
      if (formState.pdfFile) {
        formData.append("pdf", formState.pdfFile);
      }

      // Append user parameters
      formData.append("tone", formState.tone);
      formData.append("styleLevel", formState.styleLevel.toString());
      formData.append("userRequest", formState.userRequest);
      formData.append("thumbnailIndex", formState.thumbnailIndex.toString());

      if (hasCustomKey) {
        formData.append("userApiKey", formState.userApiKey.trim());
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          `서버가 비정상 응답을 반환했습니다 (HTTP ${res.status}). 사진/PDF 용량을 줄이거나 잠시 후 다시 시도해 주세요.`
        );
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "블로그 포스트 생성 중 오류가 발생했습니다.");
      }

      setBlogContent(data.blogContent || "");
      if (data.thumbnailData) {
        setThumbnailData(data.thumbnailData);
      }

      // If public API key was used, increment daily count
      if (!hasCustomKey) {
        const key = getTodayKey();
        const nextCount = todayUsedCount + 1;
        setTodayUsedCount(nextCount);
        try {
          localStorage.setItem(key, nextCount.toString());
        } catch (e) {
          console.error("Failed to save local count:", e);
        }
      }

      setActiveTab("blog");
    } catch (err: any) {
      console.error("Generate error:", err);
      setErrorMessage(err?.message || "서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedPhoto =
    formState.photos[formState.thumbnailIndex] ||
    (formState.photos.length > 0 ? formState.photos[0] : null);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      <Header
        onReset={handleReset}
        isGenerating={isGenerating}
        hasCustomKey={hasCustomKey}
        usesRemaining={usesRemaining}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-xs font-medium shadow-2xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">
              <strong className="font-bold block mb-0.5">안내 메세지</strong>
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-700 text-xs font-bold"
            >
              닫기
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Input Form Card (5 cols on lg) */}
          <div className="lg:col-span-5">
            <InputForm
              formState={formState}
              setFormState={setFormState}
              onSubmit={handleSubmit}
              isGenerating={isGenerating}
            />
          </div>

          {/* Right Column: Preview Stage Card (7 cols on lg) */}
          <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
            {/* Clean Tab Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("blog")}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                    activeTab === "blog"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-gray-100 text-slate-600 hover:bg-gray-200"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>블로그 포스트</span>
                  {blogContent && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("thumbnail")}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                    activeTab === "thumbnail"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-gray-100 text-slate-600 hover:bg-gray-200"
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>자동 생성 썸네일</span>
                  {thumbnailData.thumbnail_main_text && (
                    <span className="w-2 h-2 rounded-full bg-yellow-300" />
                  )}
                </button>
              </div>

              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Clean Minimalism Preview
              </span>
            </div>

            {/* Loading Indicator */}
            {isGenerating && (
              <div className="p-12 text-center bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">
                  Gemini 3.6 AI 분석 & 콘텐츠 자동 생성 중...
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  본문 이미지, 스타일 레퍼런스 PDF, 사용자 지시사항을 통합하여 완성도 높은 마크다운 글과 썸네일 카피를 합성하고 있습니다.
                </p>
              </div>
            )}

            {/* Active Tab View */}
            {!isGenerating && (
              <div>
                {activeTab === "blog" && (
                  <BlogPreview
                    content={blogContent}
                    photos={formState.photos}
                  />
                )}

                {activeTab === "thumbnail" && (
                  <ThumbnailPreview
                    thumbnailData={thumbnailData}
                    setThumbnailData={setThumbnailData}
                    selectedPhoto={selectedPhoto}
                  />
                )}
              </div>
            )}

            <FooterAdSlot />
          </div>
        </div>
      </main>

      <RewardAdModal
        isOpen={showRewardAdModal}
        onClose={() => setShowRewardAdModal(false)}
        onComplete={() => {
          setShowRewardAdModal(false);
          performGenerate();
        }}
      />
    </div>
  );
}
