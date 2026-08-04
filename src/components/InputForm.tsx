import React, { useRef, useState } from "react";
import {
  ExternalLink,
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
import { FormState, UploadedPhoto } from "../types";
import { HeaderAdSlot } from "./ads/HeaderAdSlot";
import { AdSlot } from "./ads/AdSlot";

interface InputFormProps {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: () => void;
  isGenerating: boolean;
  pdfBriefing?: string;
}

const TONE_PRESETS = ["친근한 존댓말", "담백한 정보형", "자연스러운 후기형", "전문적인 리뷰형", "가벼운 일상형"];
const THUMBNAIL_STYLES = ["깔끔한 정보형", "자연스러운 일상형", "감성 후기형", "강한 주목형", "전문적인 리뷰형", "심플형"];

const STYLE_LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: "사실 정보 중심으로 짧고 담백하게 정리합니다.",
  2: "과장 없이 명확한 기본 블로그 문장으로 정리합니다.",
  3: "경험을 덧붙이기 좋은 자연스러운 후기형 초안입니다.",
  4: "감정과 분위기를 조금 더 살려 읽는 흐름을 만듭니다.",
  5: "스토리 흐름을 강하게 잡되 사용자가 사실과 경험을 꼭 보완해야 합니다.",
};

const VERCEL_SAFE_TOTAL_BYTES = 3.8 * 1024 * 1024;
const MAX_PDF_BYTES = 1.6 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1280;
const IMAGE_QUALITY = 0.72;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function getUploadBytes(state: FormState) {
  const photos = state.photos.reduce((sum, photo) => sum + photo.file.size, 0);
  const pdf = state.pdfFile?.size || 0;
  const ref = state.referenceThumbnailFile?.size || 0;
  return photos + pdf + ref;
}

async function compressImageFile(file: File, prefix = "blogdraft"): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", IMAGE_QUALITY));
  bitmap.close?.();

  if (!blob || blob.size >= file.size) return file;
  const safeName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${prefix}_${safeName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

export const InputForm: React.FC<InputFormProps> = ({ formState, setFormState, onSubmit, isGenerating, pdfBriefing }) => {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const referenceThumbnailInputRef = useRef<HTMLInputElement>(null);
  const [activePanel, setActivePanel] = useState<"photos" | "pdf" | "style" | "thumbnail" | "request">("photos");
  const [isOptimizingImages, setIsOptimizingImages] = useState(false);

  const uploadBytes = getUploadBytes(formState);
  const uploadPercent = Math.min(100, Math.round((uploadBytes / VERCEL_SAFE_TOTAL_BYTES) * 100));

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsOptimizingImages(true);
    try {
      const sourceFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
      const compressed = await Promise.all(sourceFiles.map((file) => compressImageFile(file, "photo")));
      const newPhotos: UploadedPhoto[] = compressed.map((file, idx) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${idx}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      setFormState((prev) => {
        const updated = [...prev.photos, ...newPhotos];
        const estimatedBytes = getUploadBytes({ ...prev, photos: updated });
        if (estimatedBytes > VERCEL_SAFE_TOTAL_BYTES) {
          newPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
          alert(`Vercel 배포 환경에서는 전체 업로드 용량을 ${formatBytes(VERCEL_SAFE_TOTAL_BYTES)} 이하로 유지해야 합니다. 사진 수를 줄이거나 PDF를 더 작은 파일로 올려 주세요.`);
          return prev;
        }
        return { ...prev, photos: updated, thumbnailIndex: Math.min(prev.thumbnailIndex, Math.max(0, updated.length - 1)) };
      });
    } catch (error) {
      console.error("Image compression failed:", error);
      alert("이미지 최적화 중 오류가 발생했습니다. 다른 이미지로 다시 시도해 주세요.");
    } finally {
      setIsOptimizingImages(false);
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

  const handlePdfFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
      alert("PDF 형식(.pdf)의 참고자료만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      alert(`Vercel 배포 환경에서는 PDF를 ${formatBytes(MAX_PDF_BYTES)} 이하로 올려 주세요. PDF 페이지 수를 줄이거나 이미지가 적은 PDF로 다시 저장하면 안정적입니다.`);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
      return;
    }
    setFormState((prev) => {
      const next = { ...prev, pdfFile: file, pdfFileName: file.name };
      if (getUploadBytes(next) > VERCEL_SAFE_TOTAL_BYTES) {
        alert(`전체 업로드 용량이 ${formatBytes(VERCEL_SAFE_TOTAL_BYTES)}를 넘습니다. 사진 수를 줄인 뒤 PDF를 추가해 주세요.`);
        return prev;
      }
      return next;
    });
  };

  const removePdf = () => {
    setFormState((prev) => ({ ...prev, pdfFile: null, pdfFileName: null }));
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  const handleReferenceThumbnailFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const source = files[0];
    if (!source.type.startsWith("image/")) {
      alert("참고 썸네일은 이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    const file = await compressImageFile(source, "reference_thumbnail");
    setFormState((prev) => {
      if (prev.referenceThumbnailPreviewUrl) URL.revokeObjectURL(prev.referenceThumbnailPreviewUrl);
      const previewUrl = URL.createObjectURL(file);
      const next = {
        ...prev,
        referenceThumbnailFile: file,
        referenceThumbnailFileName: file.name,
        referenceThumbnailPreviewUrl: previewUrl,
      };
      if (getUploadBytes(next) > VERCEL_SAFE_TOTAL_BYTES) {
        URL.revokeObjectURL(previewUrl);
        alert(`전체 업로드 용량이 ${formatBytes(VERCEL_SAFE_TOTAL_BYTES)}를 넘습니다. 사진 또는 PDF를 줄인 뒤 참고 썸네일을 추가해 주세요.`);
        return prev;
      }
      return next;
    });
  };

  const removeReferenceThumbnail = () => {
    setFormState((prev) => {
      if (prev.referenceThumbnailPreviewUrl) URL.revokeObjectURL(prev.referenceThumbnailPreviewUrl);
      return { ...prev, referenceThumbnailFile: null, referenceThumbnailFileName: null, referenceThumbnailPreviewUrl: null };
    });
    if (referenceThumbnailInputRef.current) referenceThumbnailInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-5">
      <HeaderAdSlot />

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Key className="h-4 w-4 text-blue-700" />
            API와 입력 자료 안내
          </h2>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline">
            Gemini API Key 발급
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <input
          type="password"
          value={formState.userApiKey}
          onChange={(event) => setFormState((prev) => ({ ...prev, userApiKey: event.target.value }))}
          placeholder="개인 Gemini API Key 선택 입력"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
        <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-slate-700">
          <input
            type="checkbox"
            checked={formState.privacyConsent}
            onChange={(event) => setFormState((prev) => ({ ...prev, privacyConsent: event.target.checked }))}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700"
          />
          <span>
            <strong className="text-blue-800">AI 초안 생성 안내를 확인했습니다.</strong> 업로드한 사진, PDF, 요청사항은 초안 생성을 위해 처리되며 최종 발행 전 사실 확인과 편집은 사용자가 진행합니다.
          </span>
        </label>
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Vercel 전송 예상 용량</span>
            <span className={uploadBytes > VERCEL_SAFE_TOTAL_BYTES ? "text-red-600" : "text-blue-700"}>
              {formatBytes(uploadBytes)} / {formatBytes(VERCEL_SAFE_TOTAL_BYTES)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full ${uploadBytes > VERCEL_SAFE_TOTAL_BYTES ? "bg-red-500" : "bg-blue-600"}`} style={{ width: `${uploadPercent}%` }} />
          </div>
          <p className="mt-2 text-[11px] leading-4 text-slate-500">Vercel 함수는 큰 파일 업로드를 제한합니다. 이미지는 자동 압축되며, PDF는 작은 파일만 허용합니다.</p>
        </div>
      </section>

      <div className="grid grid-cols-5 gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        {[
          { id: "photos" as const, label: "사진", icon: ImageIcon },
          { id: "pdf" as const, label: "PDF", icon: FileText },
          { id: "style" as const, label: "말투", icon: MessageSquare },
          { id: "thumbnail" as const, label: "썸네일", icon: Palette },
          { id: "request" as const, label: "요청", icon: HelpCircle },
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
              사진에서 글로, 글에서 썸네일까지
            </h2>
            <span className="rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{formState.photos.length}장 선택</span>
          </div>

          <div onClick={() => photoInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
            event.preventDefault();
            handlePhotoFiles(event.dataTransfer.files);
          }} className="cursor-pointer rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center transition hover:border-blue-400 hover:bg-blue-50">
            <input ref={photoInputRef} type="file" accept="image/png, image/jpeg, image/webp" multiple className="hidden" onChange={(event) => handlePhotoFiles(event.target.files)} />
            <Upload className="mx-auto mb-2 h-6 w-6 text-blue-700" />
            <p className="text-sm font-bold text-slate-800">{isOptimizingImages ? "사진을 Vercel 배포용으로 압축하는 중입니다." : "본문 사진을 올려 글의 흐름과 썸네일 대표 사진을 정해 주세요."}</p>
            <p className="mt-1 text-xs text-slate-500">이미지는 긴 변 기준 1280px 이하 JPEG로 자동 최적화됩니다.</p>
          </div>

          {formState.photos.length > 0 && (
            <div className="mt-3 grid max-h-60 grid-cols-3 gap-2 overflow-y-auto pr-1">
              {formState.photos.map((photo, index) => {
                const selected = formState.thumbnailIndex === index;
                return (
                  <div key={photo.id} className={`overflow-hidden rounded-lg border-2 bg-white ${selected ? "border-blue-700 ring-2 ring-blue-100" : "border-slate-200"}`}>
                    <div className="relative aspect-square bg-slate-100">
                      <img src={photo.previewUrl} alt={`업로드 사진 ${index + 1}`} className="h-full w-full object-cover" />
                      <span className="absolute left-1 top-1 rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-bold text-white">사진 {index + 1}</span>
                      <button type="button" onClick={() => handleRemovePhoto(photo.id, index)} className="absolute right-1 top-1 rounded-full bg-slate-950/70 p-1 text-white hover:bg-red-600" title="사진 제거">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <label className={`flex cursor-pointer items-center justify-center gap-1 px-1 py-1.5 text-[11px] font-bold ${selected ? "bg-blue-50 text-blue-700" : "text-slate-600"}`}>
                      <input type="radio" name="thumbnail-photo" checked={selected} onChange={() => setFormState((prev) => ({ ...prev, thumbnailIndex: index }))} className="h-3 w-3" />
                      대표 사진
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
            <h2 className="text-sm font-black text-slate-950">내 글 스타일 참고하기</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">기존 블로그 글 PDF를 등록하면 문장 호흡, 말투, 소제목 구성, 이모지 사용 방식을 참고합니다.</p>
          </div>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
            {!formState.pdfFile ? (
              <button type="button" onClick={() => pdfInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 text-sm font-bold text-slate-700">
                <FileUp className="h-4 w-4 text-blue-700" />
                기존 글 PDF 등록
              </button>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-blue-700" />
                  <span className="truncate text-sm font-bold text-slate-800">{formState.pdfFileName}</span>
                  <span className="text-xs text-slate-500">{formatBytes(formState.pdfFile.size)}</span>
                </div>
                <button type="button" onClick={removePdf} className="text-slate-400 hover:text-red-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={(event) => handlePdfFiles(event.target.files)} />
          </div>
          <ul className="space-y-1 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            <li>기존 글을 그대로 복사하지 않습니다.</li>
            <li>문장 구조와 분위기만 참고합니다.</li>
            <li>Vercel 배포 안정성을 위해 PDF는 {formatBytes(MAX_PDF_BYTES)} 이하만 받습니다.</li>
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
            <label className="mb-2 block text-xs font-bold text-slate-700">기본 말투</label>
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
                표현 강도
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
          <h2 className="text-sm font-black text-slate-950">글과 어울리는 썸네일까지 한 번에</h2>
          <p className="mt-2 text-xs leading-5 text-slate-600">참고 썸네일을 등록하면 글자 위치, 문구 길이, 여백과 분위기를 참고합니다.</p>
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
            {!formState.referenceThumbnailPreviewUrl ? (
              <button type="button" onClick={() => referenceThumbnailInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 text-sm font-bold text-slate-700">
                <FileUp className="h-4 w-4 text-blue-700" />
                참고 썸네일 등록
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <img src={formState.referenceThumbnailPreviewUrl} alt="참고 썸네일" className="h-16 w-16 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{formState.referenceThumbnailFileName}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">구성과 분위기만 참고하며, 이미지는 자동 압축됩니다.</p>
                </div>
                <button type="button" onClick={removeReferenceThumbnail} className="text-slate-400 hover:text-red-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <input ref={referenceThumbnailInputRef} type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={(event) => handleReferenceThumbnailFiles(event.target.files)} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {THUMBNAIL_STYLES.map((style) => (
              <button key={style} type="button" onClick={() => setFormState((prev) => ({ ...prev, userRequest: `${prev.userRequest}\n썸네일 스타일: ${style}`.trim() }))} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50">
                {style}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <AdSlot width={300} height={250} label="Sidebar 300x250 광고 영역" className="mx-auto" />
          </div>
        </section>
      )}

      {activePanel === "request" && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <label className="mb-2 flex items-center gap-2 text-sm font-black text-slate-950">
            <HelpCircle className="h-4 w-4 text-blue-700" />
            추가 요청사항
          </label>
          <textarea
            rows={6}
            value={formState.userRequest}
            onChange={(event) => setFormState((prev) => ({ ...prev, userRequest: event.target.value }))}
            placeholder="예: 직접 다녀온 느낌을 살리고 싶어요. 가격 정보는 제가 나중에 확인할 예정이니 단정적으로 쓰지 말아 주세요."
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </section>
      )}

      <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
          <div className="text-xs leading-5 text-slate-700">
            <strong className="block text-sm text-slate-950">복사해서 끝내는 글이 아니라, 수정하기 쉬운 초안을 만듭니다.</strong>
            업로드 파일은 Vercel 배포 제한에 맞춰 자동 최적화됩니다.
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={onSubmit}
        disabled={isGenerating || isOptimizingImages || uploadBytes > VERCEL_SAFE_TOTAL_BYTES}
        className={`flex items-center justify-center gap-2 rounded-lg py-4 text-sm font-black shadow-sm transition ${isGenerating || isOptimizingImages || uploadBytes > VERCEL_SAFE_TOTAL_BYTES ? "cursor-not-allowed bg-slate-200 text-slate-400" : "bg-blue-700 text-white hover:bg-blue-800"}`}
      >
        {isGenerating ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            초안과 썸네일 문구 정리 중
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            수정 가능한 블로그 초안과 썸네일 만들기
          </>
        )}
      </button>
    </div>
  );
};
