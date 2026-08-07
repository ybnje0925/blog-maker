import React, { useRef, useState } from "react";
import {
  FileText,
  FileUp,
  HelpCircle,
  ImageIcon,
  Key,
  MessageSquare,
  Palette,
  ShieldCheck,
  Sliders,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { AIProvider, FormState, UploadedPhoto } from "../types";
import { HeaderAdSlot } from "./ads/HeaderAdSlot";
import { AdSlot } from "./ads/AdSlot";
import { optimizeImageFile } from "../imageOptimization";
import {
  formatBytes,
  MAX_OPTIMIZED_PHOTOS_BYTES,
  MAX_ORIGINAL_PHOTO_BYTES,
  MAX_ORIGINAL_SELECTION_BYTES,
  MAX_PDF_BYTES,
  MAX_PHOTO_COUNT,
  MAX_REFERENCE_THUMBNAIL_BYTES,
} from "../uploadLimits";

interface InputFormProps {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: () => void;
  isGenerating: boolean;
  pdfBriefing?: string;
  usesRemaining: number;
}

const TONE_PRESETS = ["친근한 조언말", "담백한 정보형", "자연스러운 후기형", "전문적인 리뷰형", "가벼운 일상형"];
const THUMBNAIL_STYLES = ["깔끔한 정보형", "자연스러운 일상형", "감성 후기형", "강한 주목형", "전문적인 리뷰형", "심플형"];

const STYLE_LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: "?ъ떎 ?뺣낫 以묒떖?쇰줈 吏㏐퀬 ?대갚?섍쾶 ?뺣━?⑸땲??",
  2: "怨쇱옣 ?놁씠 紐낇솗??湲곕낯 釉붾줈洹?臾몄옣?쇰줈 ?뺣━?⑸땲??",
  3: "寃쏀뿕???㏓텤?닿린 醫뗭? ?먯뿰?ㅻ윭???꾧린??珥덉븞?낅땲??",
  4: "媛먯젙怨?遺꾩쐞湲곕? 議곌툑 ???대젮 ?쎈뒗 ?먮쫫??留뚮벊?덈떎.",
  5: "?ㅽ넗由??먮쫫??媛뺥븯寃??〓릺 ?ㅼ젣 寃쏀뿕? ?ъ슜?먭? 瑗?蹂댁셿?댁빞 ?⑸땲??",
};

const AI_PROVIDER_OPTIONS: Array<{ id: AIProvider; title: string; body: string; disabled?: boolean }> = [
  { id: "gemini", title: "Gemini Flash", body: "기본 AI 모델로 사용합니다. API Key는 서버 환경변수에서 읽습니다." },
  { id: "openai", title: "OpenAI", body: "준비 중(Coming Soon)입니다.", disabled: true },
];

function getUploadBytes(state: FormState) {
  const photos = state.photos.reduce((sum, photo) => sum + photo.file.size, 0);
  const pdf = state.pdfFile?.size || 0;
  const ref = state.referenceThumbnailFile?.size || 0;
  return photos + pdf + ref;
}

export const InputForm: React.FC<InputFormProps> = ({ formState, setFormState, onSubmit, isGenerating, pdfBriefing, usesRemaining }) => {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const referenceThumbnailInputRef = useRef<HTMLInputElement>(null);
  const [activePanel, setActivePanel] = useState<"photos" | "pdf" | "style" | "thumbnail" | "request">("photos");
  const [isOptimizingImages, setIsOptimizingImages] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState({ current: 0, total: 0 });
  const [uploadError, setUploadError] = useState<string | null>(null);

  const optimizedPhotoBytes = formState.photos.reduce((sum, photo) => sum + photo.file.size, 0);
  const uploadPercent = Math.min(100, Math.round((optimizedPhotoBytes / MAX_OPTIMIZED_PHOTOS_BYTES) * 100));
  const originalSelectionBytes =
    formState.photos.reduce((sum, photo) => sum + photo.originalSize, 0) +
    (formState.pdfFile?.size || 0) +
    (formState.referenceThumbnailFile?.size || 0);

  const isSupportedImageFile = (file: File) => {
    const hasAllowedExtension = /\.(jpe?g|png|webp)$/i.test(file.name);
    const hasAllowedMime = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    return hasAllowedExtension && hasAllowedMime;
  };

  const showUploadError = (message: string) => setUploadError(message);
  const clearFileInput = (input: HTMLInputElement | null) => {
    if (input) input.value = "";
  };

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setIsOptimizingImages(true);
    setOptimizationProgress({ current: 0, total: files.length });
    try {
      const sourceFiles = Array.from(files);
      const emptyFile = sourceFiles.find((file) => file.size === 0);
      if (emptyFile) {
        showUploadError(`${emptyFile.name || "?좏깮???뚯씪"}? 鍮??뚯씪?낅땲?? ?먮낯 ?대?吏瑜??ㅼ떆 ??ν븳 ???낅줈?쒗빐 二쇱꽭??`);
        return;
      }
      const unsupported = sourceFiles.find((file) => !isSupportedImageFile(file));
      if (unsupported) {
        showUploadError(`${unsupported.name}? 吏?먰븯吏 ?딅뒗 ?대?吏?낅땲?? JPG, PNG, WebP ?뚯씪濡?蹂?섑븳 ???ㅼ떆 ?낅줈?쒗빐 二쇱꽭??`);
        return;
      }
      const existingKeys = new Set(formState.photos.map((photo) => `${photo.originalName}_${photo.originalSize}`));
      const seenKeys = new Set<string>();
      const duplicate = sourceFiles.find((file) => {
        const selectedKey = `${file.name}_${file.size}_${file.lastModified}`;
        const existingKey = `${file.name}_${file.size}`;
        if (seenKeys.has(selectedKey) || existingKeys.has(existingKey)) return true;
        seenKeys.add(selectedKey);
        return false;
      });
      if (duplicate) {
        showUploadError(`${duplicate.name}? ?대? ?좏깮???ъ쭊怨?以묐났?⑸땲?? 以묐났 ?뚯씪???쒖쇅?섍퀬 ?ㅼ떆 ?좏깮??二쇱꽭??`);
        return;
      }
      if (formState.photos.length + sourceFiles.length > MAX_PHOTO_COUNT) {
        showUploadError(`?ъ쭊? 理쒕? ${MAX_PHOTO_COUNT}?κ퉴吏 ?낅줈?쒗븷 ???덉뒿?덈떎. ?쇰? ?ъ쭊???쒓굅?????ㅼ떆 ?좏깮??二쇱꽭??`);
        return;
      }
      const oversized = sourceFiles.find((file) => file.size > MAX_ORIGINAL_PHOTO_BYTES);
      if (oversized) {
        showUploadError(`${oversized.name}???⑸웾???덈Т ?쎈땲?? ?ъ쭊 1?λ떦 ${formatBytes(MAX_ORIGINAL_PHOTO_BYTES)} ?댄븯濡?以꾩뿬 二쇱꽭??`);
        return;
      }
      const nextOriginalBytes = originalSelectionBytes + sourceFiles.reduce((sum, file) => sum + file.size, 0);
      if (nextOriginalBytes > MAX_ORIGINAL_SELECTION_BYTES) {
        showUploadError(`?꾩껜 ?먮낯 ?좏깮 ?⑸웾? ${formatBytes(MAX_ORIGINAL_SELECTION_BYTES)} ?댄븯留?媛?ν빀?덈떎. ?ъ쭊?대굹 PDF ?⑸웾??以꾩뿬 二쇱꽭??`);
        return;
      }

      const optimizedResults = [];
      for (let index = 0; index < sourceFiles.length; index += 1) {
        setOptimizationProgress({ current: index + 1, total: sourceFiles.length });
        optimizedResults.push(await optimizeImageFile(sourceFiles[index]));
      }
      const newPhotos: UploadedPhoto[] = optimizedResults.map((result, idx) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${idx}`,
        file: result.file,
        previewUrl: URL.createObjectURL(result.file),
        originalName: result.originalName,
        originalSize: result.originalSize,
        optimizedSize: result.optimizedSize,
        optimizedMimeType: result.optimizedMimeType,
      }));

      setFormState((prev) => {
        const updated = [...prev.photos, ...newPhotos];
        const estimatedPhotoBytes = updated.reduce((sum, photo) => sum + photo.file.size, 0);
        if (estimatedPhotoBytes > MAX_OPTIMIZED_PHOTOS_BYTES) {
          newPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
          showUploadError(`?대?吏 ?뺤텞 ???꾩껜 ?ъ쭊 ?⑸웾? ${formatBytes(MAX_OPTIMIZED_PHOTOS_BYTES)} ?댄븯留?媛?ν빀?덈떎. ?ъ쭊 ?섎? 以꾩뿬 二쇱꽭??`);
          return prev;
        }
        return { ...prev, photos: updated, thumbnailIndex: Math.min(prev.thumbnailIndex, Math.max(0, updated.length - 1)) };
      });
    } catch (error) {
      showUploadError(error instanceof Error ? error.message : "?대?吏 理쒖쟻??以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?ㅻⅨ ?대?吏濡??ㅼ떆 ?쒕룄??二쇱꽭??");
    } finally {
      setIsOptimizingImages(false);
      clearFileInput(photoInputRef.current);
    }
  };

  const handleRemovePhoto = (id: string, indexToRemove: number) => {
    setFormState((prev) => {
      const removed = prev.photos.find((photo) => photo.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      const updated = prev.photos.filter((photo) => photo.id !== id);
      const nextIndex = indexToRemove <= prev.thumbnailIndex ? Math.max(0, prev.thumbnailIndex - 1) : prev.thumbnailIndex;
      return { ...prev, photos: updated, thumbnailIndex: Math.min(nextIndex, Math.max(0, updated.length - 1)) };
    });
  };

  const handlePdfFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    const file = files[0];
    if (file.size === 0) {
      showUploadError("?좏깮??PDF媛 鍮??뚯씪?낅땲?? ?먮낯 PDF瑜??ㅼ떆 ??ν븳 ???낅줈?쒗빐 二쇱꽭??");
      clearFileInput(pdfInputRef.current);
      return;
    }
    if (!(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
      showUploadError("李멸퀬?먮즺??PDF ?뺤떇(.pdf)留??낅줈?쒗븷 ???덉뒿?덈떎. ?뚯씪 ?뺤떇???뺤씤??二쇱꽭??");
      clearFileInput(pdfInputRef.current);
      return;
    }
    const pdfHeader = await file.slice(0, 5).text().catch(() => "");
    if (pdfHeader !== "%PDF-") {
      showUploadError(`${file.name}? PDF濡??쎌쓣 ???놁뒿?덈떎. ?먯긽?섏? ?딆? PDF ?뚯씪?몄? ?뺤씤??二쇱꽭??`);
      clearFileInput(pdfInputRef.current);
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      showUploadError(`PDF??${formatBytes(MAX_PDF_BYTES)} ?댄븯留??낅줈?쒗븷 ???덉뒿?덈떎. PDF ?섏씠吏 ?섎? 以꾩씠嫄곕굹 ?뺤텞??二쇱꽭??`);
      clearFileInput(pdfInputRef.current);
      return;
    }
    setFormState((prev) => {
      const nextOriginalBytes = formState.photos.reduce((sum, photo) => sum + photo.originalSize, 0) + file.size + (formState.referenceThumbnailFile?.size || 0);
      if (nextOriginalBytes > MAX_ORIGINAL_SELECTION_BYTES) {
        showUploadError(`?꾩껜 ?먮낯 ?좏깮 ?⑸웾? ${formatBytes(MAX_ORIGINAL_SELECTION_BYTES)} ?댄븯留?媛?ν빀?덈떎. PDF ?먮뒗 ?ъ쭊 ?⑸웾??以꾩뿬 二쇱꽭??`);
        return prev;
      }
      return { ...prev, pdfFile: file, pdfFileName: file.name };
    });
  };

  const removePdf = () => {
    setFormState((prev) => ({ ...prev, pdfFile: null, pdfFileName: null }));
    clearFileInput(pdfInputRef.current);
  };

  const handleReferenceThumbnailFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    const source = files[0];
    if (source.size === 0) {
      showUploadError("李멸퀬 ?몃꽕?쇱씠 鍮??뚯씪?낅땲?? ?ㅻⅨ ?대?吏 ?뚯씪???좏깮??二쇱꽭??");
      clearFileInput(referenceThumbnailInputRef.current);
      return;
    }
    if (!isSupportedImageFile(source)) {
      showUploadError("李멸퀬 ?몃꽕?쇱? JPG, PNG, WebP ?대?吏留??낅줈?쒗븷 ???덉뒿?덈떎.");
      clearFileInput(referenceThumbnailInputRef.current);
      return;
    }
    if (source.size > MAX_REFERENCE_THUMBNAIL_BYTES) {
      showUploadError(`李멸퀬 ?몃꽕?쇱? ${formatBytes(MAX_REFERENCE_THUMBNAIL_BYTES)} ?댄븯留??낅줈?쒗븷 ???덉뒿?덈떎.`);
      clearFileInput(referenceThumbnailInputRef.current);
      return;
    }
    let optimized;
    try {
      optimized = await optimizeImageFile(source);
    } catch (error) {
      showUploadError(error instanceof Error ? error.message : "李멸퀬 ?몃꽕??理쒖쟻??以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?ㅻⅨ ?대?吏濡??ㅼ떆 ?쒕룄??二쇱꽭??");
      clearFileInput(referenceThumbnailInputRef.current);
      return;
    }
    const file = optimized.file;
    setFormState((prev) => {
      if (prev.referenceThumbnailPreviewUrl) URL.revokeObjectURL(prev.referenceThumbnailPreviewUrl);
      const previewUrl = URL.createObjectURL(file);
      const nextOriginalBytes = formState.photos.reduce((sum, photo) => sum + photo.originalSize, 0) + (formState.pdfFile?.size || 0) + source.size;
      if (nextOriginalBytes > MAX_ORIGINAL_SELECTION_BYTES) {
        URL.revokeObjectURL(previewUrl);
        showUploadError(`?꾩껜 ?먮낯 ?좏깮 ?⑸웾? ${formatBytes(MAX_ORIGINAL_SELECTION_BYTES)} ?댄븯留?媛?ν빀?덈떎. 李멸퀬 ?몃꽕???먮뒗 ?ㅻⅨ ?뚯씪 ?⑸웾??以꾩뿬 二쇱꽭??`);
        return prev;
      }
      return {
        ...prev,
        referenceThumbnailFile: file,
        referenceThumbnailFileName: file.name,
        referenceThumbnailPreviewUrl: previewUrl,
      };
    });
  };

  const removeReferenceThumbnail = () => {
    setFormState((prev) => {
      if (prev.referenceThumbnailPreviewUrl) URL.revokeObjectURL(prev.referenceThumbnailPreviewUrl);
      return { ...prev, referenceThumbnailFile: null, referenceThumbnailFileName: null, referenceThumbnailPreviewUrl: null };
    });
    clearFileInput(referenceThumbnailInputRef.current);
  };

  return (
    <div className="flex flex-col gap-5">
      <HeaderAdSlot />

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Key className="h-4 w-4 text-blue-700" />
            AI 모델
          </h2>
          <span className="text-xs font-bold text-blue-700">무료 생성 3회 제공</span>
        </div>

        <p className="mb-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-slate-700">
          오늘 무료 생성 3회가 제공됩니다. AI 모델은 Gemini Flash를 기본으로 사용하며, API Key는 서버 환경변수에서 읽습니다.
          OpenAI는 현재 준비 중(Coming Soon)입니다.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {AI_PROVIDER_OPTIONS.map((provider) => (
            <label
              key={provider.id}
              className={`flex gap-3 rounded-lg border p-3 text-left transition ${
                provider.disabled
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : formState.aiProvider === provider.id
                    ? "cursor-pointer border-blue-300 bg-blue-50"
                    : "cursor-pointer border-slate-200 bg-slate-50 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="ai-provider"
                checked={formState.aiProvider === provider.id}
                disabled={provider.disabled}
                onChange={() => {
                  if (!provider.disabled) setFormState((prev) => ({ ...prev, aiProvider: provider.id }));
                }}
                className="mt-1 h-4 w-4"
              />
              <span>
                <strong className="block text-sm text-slate-950">{provider.title}</strong>
                <span className="mt-1 block text-xs leading-5 text-slate-600">{provider.body}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-slate-800">Gemini Flash로 생성합니다.</span>
            <span className="font-bold text-blue-700">오늘 남은 무료 생성: {usesRemaining}회</span>
          </div>
          <p className="mt-2">Gemini API Key는 서버 환경변수에서 읽으며, 브라우저에 개인 API Key를 저장하지 않습니다.</p>
        </div>
        <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-slate-700">
          <input
            type="checkbox"
            checked={formState.privacyConsent}
            onChange={(event) => setFormState((prev) => ({ ...prev, privacyConsent: event.target.checked }))}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700"
          />
          <span>
            <strong className="text-blue-800">AI 珥덉븞 ?앹꽦 ?덈궡瑜??뺤씤?덉뒿?덈떎.</strong> ?낅줈?쒗븳 ?ъ쭊, PDF, ?붿껌?ы빆? ?좏깮??AI ?쒓났?먯뿉寃??꾩넚?????덉쑝硫?理쒖쥌 諛쒗뻾 ???ъ떎 ?뺤씤怨??몄쭛? ?ъ슜?먭? 吏꾪뻾?⑸땲??
          </span>
        </label>

        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>?쒕쾭 ?꾩넚 ?덉긽 ?⑸웾</span>
            <span className={optimizedPhotoBytes > MAX_OPTIMIZED_PHOTOS_BYTES ? "text-red-600" : "text-blue-700"}>
              ?ъ쭊 {formatBytes(optimizedPhotoBytes)} / {formatBytes(MAX_OPTIMIZED_PHOTOS_BYTES)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full ${optimizedPhotoBytes > MAX_OPTIMIZED_PHOTOS_BYTES ? "bg-red-500" : "bg-blue-600"}`} style={{ width: `${uploadPercent}%` }} />
          </div>
          <p className="mt-2 text-[11px] leading-4 text-slate-500">?쒕쾭 ?덉젙?깆쓣 ?꾪빐 ?대?吏???먮룞 ?뺤텞?섎ŉ, PDF???묒? ?뚯씪留??덉슜?⑸땲??</p>
        </div>
      </section>

      {uploadError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
          {uploadError}
        </div>
      )}

      <div className="grid grid-cols-5 gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        {[
          { id: "photos" as const, label: "?ъ쭊", icon: ImageIcon },
          { id: "pdf" as const, label: "PDF", icon: FileText },
          { id: "style" as const, label: "留먰닾", icon: MessageSquare },
          { id: "thumbnail" as const, label: "썸네일", icon: Palette },
          { id: "request" as const, label: "?붿껌", icon: HelpCircle },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActivePanel(id)}
            className={`flex min-h-10 items-center justify-center gap-1 rounded-md text-xs font-bold transition ${activePanel === id ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activePanel === "photos" && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-950">
              <ImageIcon className="h-4 w-4 text-blue-700" />
              ?ъ쭊?먯꽌 湲濡? 湲?먯꽌 ?몃꽕?쇨퉴吏
            </h2>
            <span className="rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{formState.photos.length}???좏깮</span>
          </div>

          <div
            onClick={() => photoInputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handlePhotoFiles(event.dataTransfer.files);
            }}
            className="cursor-pointer rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center transition hover:border-blue-400 hover:bg-blue-50"
          >
            <input ref={photoInputRef} type="file" accept="image/png, image/jpeg, image/webp" multiple className="hidden" onChange={(event) => handlePhotoFiles(event.target.files)} aria-label="본문 사진 업로드" />
            <Upload className="mx-auto mb-2 h-6 w-6 text-blue-700" />
            <p className="text-sm font-bold text-slate-800">{isOptimizingImages ? "?ъ쭊???쒕쾭 ?꾩넚??留욊쾶 ?뺤텞?섎뒗 以묒엯?덈떎." : "蹂몃Ц ?ъ쭊???щ젮 湲???먮쫫怨??몃꽕??????ъ쭊???뺥빐 二쇱꽭??"}</p>
            <p className="mt-1 text-xs text-slate-500">?대?吏???낅줈?????먮룞 理쒖쟻?붾맗?덈떎.</p>
          </div>

          {isOptimizingImages && optimizationProgress.total > 0 && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-blue-700">
              ?ъ쭊 理쒖쟻??{optimizationProgress.current}/{optimizationProgress.total}
            </div>
          )}

          {formState.photos.length > 0 && (
            <div className="mt-3 grid max-h-60 grid-cols-3 gap-2 overflow-y-auto pr-1">
              {formState.photos.map((photo, index) => {
                const selected = formState.thumbnailIndex === index;
                return (
                  <div key={photo.id} className={`overflow-hidden rounded-lg border-2 bg-white ${selected ? "border-blue-700 ring-2 ring-blue-100" : "border-slate-200"}`}>
                    <div className="relative aspect-square bg-slate-100">
                      <img src={photo.previewUrl} alt={`?낅줈???ъ쭊 ${index + 1}`} className="h-full w-full object-cover" />
                      <span className="absolute left-1 top-1 rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-bold text-white">?ъ쭊 {index + 1}</span>
                      <button type="button" onClick={() => handleRemovePhoto(photo.id, index)} className="absolute right-1 top-1 rounded-full bg-slate-950/70 p-1 text-white hover:bg-red-600" title="?ъ쭊 ?쒓굅" aria-label={`?ъ쭊 ${index + 1} ?쒓굅`}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <label className={`flex cursor-pointer items-center justify-center gap-1 px-1 py-1.5 text-[11px] font-bold ${selected ? "bg-blue-50 text-blue-700" : "text-slate-600"}`}>
                      <input type="radio" name="thumbnail-photo" checked={selected} onChange={() => setFormState((prev) => ({ ...prev, thumbnailIndex: index }))} className="h-3 w-3" />
                      ????ъ쭊
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activePanel === "pdf" && (
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-sm font-black text-slate-950">??湲 ?ㅽ???李멸퀬?섍린</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">湲곗〈 釉붾줈洹?湲 PDF瑜??깅줉?섎㈃ 臾몄옣 ?명씉, 留먰닾, ?뚯젣紐?援ъ꽦, ?대?吏 ?ъ슜 諛⑹떇??李멸퀬?⑸땲??</p>
          </div>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
            {!formState.pdfFile ? (
              <button type="button" onClick={() => pdfInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 text-sm font-bold text-slate-700">
                <FileUp className="h-4 w-4 text-blue-700" />
                湲곗〈 湲 PDF ?깅줉
              </button>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-blue-700" />
                  <span className="truncate text-sm font-bold text-slate-800">{formState.pdfFileName}</span>
                  <span className="text-xs text-slate-500">{formatBytes(formState.pdfFile.size)}</span>
                </div>
                <button type="button" onClick={removePdf} className="text-slate-400 hover:text-red-600" aria-label="PDF ?쒓굅">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={(event) => handlePdfFiles(event.target.files)} aria-label="참고 PDF 업로드" />
          </div>
          <ul className="space-y-1 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            <li>湲곗〈 湲??洹몃?濡?蹂듭궗?섏? ?딆뒿?덈떎.</li>
            <li>臾몄옣 援ъ“? 遺꾩쐞湲곕쭔 李멸퀬?⑸땲??</li>
            <li>?쒕쾭 ?덉젙?깆쓣 ?꾪빐 PDF??{formatBytes(MAX_PDF_BYTES)} ?댄븯留?諛쏆뒿?덈떎.</li>
          </ul>
          {pdfBriefing && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <h3 className="text-xs font-black text-blue-900">PDF 스타일 분석 브리핑</h3>
              <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-700">{pdfBriefing}</p>
            </div>
          )}
        </section>
      )}

      {activePanel === "style" && (
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-700">湲곕낯 留먰닾</label>
            <input value={formState.tone} onChange={(event) => setFormState((prev) => ({ ...prev, tone: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TONE_PRESETS.map((preset) => (
                <button key={preset} type="button" onClick={() => setFormState((prev) => ({ ...prev, tone: preset }))} className={`rounded border px-2 py-1 text-xs font-bold ${formState.tone === preset ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {preset}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1 text-xs font-bold text-slate-700">
                <Sliders className="h-3.5 w-3.5 text-blue-700" />
                ?쒗쁽 媛뺣룄
              </label>
              <span className="rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">Level {formState.styleLevel}</span>
            </div>
            <input type="range" min={1} max={5} value={formState.styleLevel} onChange={(event) => setFormState((prev) => ({ ...prev, styleLevel: parseInt(event.target.value, 10) }))} className="w-full accent-blue-700" />
            <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs leading-5 text-slate-600">{STYLE_LEVEL_DESCRIPTIONS[formState.styleLevel]}</p>
          </div>
        </section>
      )}

      {activePanel === "thumbnail" && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black text-slate-950">湲怨??댁슱由щ뒗 ?몃꽕?쇨퉴吏 ??踰덉뿉</h2>
          <p className="mt-2 text-xs leading-5 text-slate-600">李멸퀬 ?몃꽕?쇱쓣 ?깅줉?섎㈃ 湲???꾩튂, 臾멸뎄 湲몄씠, ?щ갚怨?遺꾩쐞湲곕? 李멸퀬?⑸땲??</p>
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
            {!formState.referenceThumbnailPreviewUrl ? (
              <button type="button" onClick={() => referenceThumbnailInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 text-sm font-bold text-slate-700">
                <FileUp className="h-4 w-4 text-blue-700" />
                李멸퀬 ?몃꽕???깅줉
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <img src={formState.referenceThumbnailPreviewUrl} alt="참고 썸네일" className="h-16 w-16 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{formState.referenceThumbnailFileName}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">援ъ꽦怨?遺꾩쐞湲곕쭔 李멸퀬?섎ŉ, ?대?吏???먮룞 ?뺤텞?⑸땲??</p>
                </div>
                <button type="button" onClick={removeReferenceThumbnail} className="text-slate-400 hover:text-red-600" aria-label="李멸퀬 ?몃꽕???쒓굅">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <input ref={referenceThumbnailInputRef} type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={(event) => handleReferenceThumbnailFiles(event.target.files)} aria-label="참고 썸네일 업로드" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {THUMBNAIL_STYLES.map((style) => (
              <button key={style} type="button" onClick={() => setFormState((prev) => ({ ...prev, userRequest: `${prev.userRequest}\n?몃꽕???ㅽ??? ${style}`.trim() }))} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50">
                {style}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <AdSlot width={300} height={250} label="Sidebar 300x250 愿묎퀬 ?곸뿭" className="mx-auto" />
          </div>
        </section>
      )}

      {activePanel === "request" && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <label className="mb-2 flex items-center gap-2 text-sm font-black text-slate-950">
            <HelpCircle className="h-4 w-4 text-blue-700" />
            異붽? ?붿껌?ы빆
          </label>
          <textarea
            rows={6}
            value={formState.userRequest}
            onChange={(event) => setFormState((prev) => ({ ...prev, userRequest: event.target.value }))}
            placeholder="吏곸젒 ?ㅻ???寃쏀뿕, 媛뺤“?섍퀬 ?띠? ?? 媛寃??뺣낫???뺤씤 ?덉젙 媛숈? ?댁슜???곸뼱 二쇱꽭??"
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </section>
      )}

      <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
          <div className="text-xs leading-5 text-slate-700">
            <strong className="block text-sm text-slate-950">蹂듭궗?댁꽌 諛쒗뻾?섎뒗 湲???꾨땲?? ?섏젙?섍린 ?ъ슫 珥덉븞??留뚮벊?덈떎.</strong>
            ?낅줈???뚯씪? ?쒕쾭 ?꾩넚??留욎떠 ?먮룞 理쒖쟻?붾맗?덈떎.
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={onSubmit}
        disabled={isGenerating || isOptimizingImages || optimizedPhotoBytes > MAX_OPTIMIZED_PHOTOS_BYTES}
        className={`flex items-center justify-center gap-2 rounded-lg py-4 text-sm font-black shadow-sm transition ${isGenerating || isOptimizingImages || optimizedPhotoBytes > MAX_OPTIMIZED_PHOTOS_BYTES ? "cursor-not-allowed bg-slate-200 text-slate-400" : "bg-blue-700 text-white hover:bg-blue-800"}`}
      >
        {isGenerating ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            珥덉븞怨??몃꽕??臾멸뎄 ?뺣━ 以?          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            ?섏젙 媛?ν븳 釉붾줈洹?珥덉븞怨??몃꽕??留뚮뱾湲?          </>
        )}
      </button>
    </div>
  );
};
