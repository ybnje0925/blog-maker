import React, { useRef } from "react";
import {
  Upload,
  ImageIcon,
  FileText,
  X,
  CheckCircle2,
  Sliders,
  Sparkles,
  MessageSquare,
  HelpCircle,
  FileUp,
  Key,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { FormState, UploadedPhoto } from "../types";

interface InputFormProps {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: () => void;
  isGenerating: boolean;
}

const TONE_PRESETS = [
  "친근한 해요체",
  "정중한 습니다체",
  "솔직 유쾌한 반말체",
  "전문적인 분석조",
];

const STYLE_LEVEL_DESCRIPTIONS: { [key: number]: string } = {
  1: "1단계: 건조한 사실 및 정보 전달 중심",
  2: "2단계: 깔끔하고 명확한 기본 가독성",
  3: "3단계: 생생한 체험과 친근한 블로그 어조 (권장)",
  4: "4단계: 감성과 현장감이 살아있는 풍부한 서사",
  5: "5단계: 감성/스토리텔링 극대화 (상세 경험 묘사)",
};

export const InputForm: React.FC<InputFormProps> = ({
  formState,
  setFormState,
  onSubmit,
  isGenerating,
}) => {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Handle Photo Upload
  const handlePhotoFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newPhotos: UploadedPhoto[] = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .map((file, idx) => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${idx}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));

    setFormState((prev) => {
      const updated = [...prev.photos, ...newPhotos];
      return {
        ...prev,
        photos: updated,
        thumbnailIndex:
          prev.thumbnailIndex >= updated.length ? 0 : prev.thumbnailIndex,
      };
    });
  };

  // Remove single photo
  const handleRemovePhoto = (id: string, indexToRemove: number) => {
    setFormState((prev) => {
      const updated = prev.photos.filter((p) => p.id !== id);
      let newThumbIdx = prev.thumbnailIndex;
      if (indexToRemove === prev.thumbnailIndex) {
        newThumbIdx = 0;
      } else if (indexToRemove < prev.thumbnailIndex) {
        newThumbIdx = prev.thumbnailIndex - 1;
      }
      return {
        ...prev,
        photos: updated,
        thumbnailIndex: Math.max(0, Math.min(newThumbIdx, updated.length - 1)),
      };
    });
  };

  // Handle PDF Upload
  const handlePdfFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setFormState((prev) => ({
        ...prev,
        pdfFile: file,
        pdfFileName: file.name,
      }));
    } else {
      alert("PDF 형식(.pdf)의 문서만 업로드할 수 있습니다.");
    }
  };

  const handleRemovePdf = () => {
    setFormState((prev) => ({
      ...prev,
      pdfFile: null,
      pdfFileName: null,
    }));
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  const isButtonDisabled = isGenerating;

  return (
    <div className="flex flex-col gap-5 overflow-hidden">
      {/* 1. API Key & Security Settings Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Key className="w-4 h-4 text-blue-600" />
            <span>API 인증 & 개인정보 설정</span>
          </h2>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
          >
            <span>🔑 1분 만에 무료 API Key 발급받기</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              개인 Gemini API Key (선택)
            </label>
            <input
              type="password"
              value={formState.userApiKey}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, userApiKey: e.target.value }))
              }
              placeholder="AIzaSy... (미입력 시 공용 API Key 1일 3회 무료 적용)"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              * 개인 Key 입력 시 호출 한도(Rate Limit) 없이 무제한으로 이용하실 수 있습니다.
            </p>
          </div>

          {/* Legal / Privacy Consent Checkbox */}
          <div className="p-3 bg-blue-50/50 border border-blue-200/80 rounded-lg">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formState.privacyConsent}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    privacyConsent: e.target.checked,
                  }))
                }
                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs text-slate-700 leading-snug">
                <strong className="text-blue-700 font-bold">[안내]</strong> Google Gemini 무료 API 이용 시, 입력 데이터(사진/PDF/텍스트)가 AI 모델 개선에 활용될 수 있음에 동의합니다. (공용 Key 사용 시 1일 3회 제한)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* 2. Photo Upload & Thumbnail Selection Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-600" />
            <span>1. 본문 사진 업로드</span>
          </h2>
          <span className="text-[11px] bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded">
            {formState.photos.length}장 선택됨
          </span>
        </div>

        {/* Drag & Drop Area */}
        <div
          onClick={() => photoInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handlePhotoFiles(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/20 rounded-lg p-3 text-center cursor-pointer transition group mb-3"
        >
          <input
            ref={photoInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            multiple
            className="hidden"
            onChange={(e) => handlePhotoFiles(e.target.files)}
          />
          <div className="flex flex-col items-center justify-center space-y-1">
            <div className="w-8 h-8 rounded-full bg-blue-50 group-hover:bg-blue-100 text-blue-600 flex items-center justify-center transition">
              <Upload className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-slate-700">
              클릭하거나 멀티 드래그 앤 드롭으로 이미지 추가
            </p>
            <p className="text-[10px] text-gray-400">
              PNG, JPG, WEBP (여러 장 지정 가능)
            </p>
          </div>
        </div>

        {/* Photos Grid with Radio Button for Thumbnail Selection */}
        {formState.photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3 max-h-56 overflow-y-auto pr-1">
            {formState.photos.map((photo, index) => {
              const isSelectedForThumbnail =
                formState.thumbnailIndex === index;
              return (
                <div
                  key={photo.id}
                  className={`relative rounded-lg overflow-hidden border-2 transition ${
                    isSelectedForThumbnail
                      ? "border-blue-600 ring-2 ring-blue-200 bg-blue-50/30"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    <img
                      src={photo.previewUrl}
                      alt={`사진 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    <span className="absolute top-1 left-1 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      [사진 {index + 1}]
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePhoto(photo.id, index);
                      }}
                      className="absolute top-1 right-1 bg-slate-900/70 hover:bg-red-600 text-white p-0.5 rounded-full transition"
                      title="삭제"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    {isSelectedForThumbnail && (
                      <div className="absolute inset-x-0 bottom-0 bg-blue-600 text-white text-[9px] font-bold py-0.5 text-center flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>대표 썸네일</span>
                      </div>
                    )}
                  </div>

                  <label
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center justify-center gap-1 p-1 text-[10px] font-medium cursor-pointer select-none transition ${
                      isSelectedForThumbnail
                        ? "text-blue-700 font-bold bg-blue-50"
                        : "text-slate-600 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="thumbnail_select"
                      checked={isSelectedForThumbnail}
                      onChange={() =>
                        setFormState((prev) => ({
                          ...prev,
                          thumbnailIndex: index,
                        }))
                      }
                      className="w-3 h-3 text-blue-600 border-gray-300"
                    />
                    <span>썸네일 선택</span>
                  </label>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. Reference PDF Upload (Independent Area) */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>2. 레퍼런스 PDF 업로드 (독립 영역)</span>
            </label>
            <span className="text-[10px] text-gray-400">선택사항 (.pdf)</span>
          </div>

          {!formState.pdfFile ? (
            <div
              onClick={() => pdfInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handlePdfFiles(e.dataTransfer.files);
              }}
              className="border border-dashed border-gray-300 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/20 rounded-lg p-2.5 text-center cursor-pointer transition flex items-center justify-center gap-2"
            >
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => handlePdfFiles(e.target.files)}
              />
              <div className="w-6 h-6 rounded bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <FileUp className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs font-medium text-slate-700">
                스타일 참고용 PDF 문서 파일 선택
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2.5 bg-blue-50/40 border border-blue-200/80 rounded-lg">
              <div className="flex items-center space-x-2 overflow-hidden">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-medium text-slate-800 truncate">
                  {formState.pdfFileName}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemovePdf}
                className="p-1 text-gray-400 hover:text-red-600 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Tone & Style Configuration Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span>3. 기본 설정 (말투 & 스타일 레벨)</span>
        </h2>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              기본 말투 (Input)
            </label>
            <input
              type="text"
              value={formState.tone}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, tone: e.target.value }))
              }
              placeholder='default: "친근한 해요체"'
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="flex flex-wrap gap-1 pt-0.5">
              {TONE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    setFormState((prev) => ({ ...prev, tone: preset }))
                  }
                  className={`text-[10px] px-2 py-0.5 rounded border transition ${
                    formState.tone === preset
                      ? "bg-blue-50 border-blue-300 text-blue-700 font-bold"
                      : "bg-gray-50 border-gray-200 text-slate-600 hover:bg-gray-100"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700">
                스타일 수준 (1~5단계)
              </label>
              <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                Level {formState.styleLevel}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={formState.styleLevel}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  styleLevel: parseInt(e.target.value, 10),
                }))
              }
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>1단계 (건조함)</span>
              <span>3단계 (권장)</span>
              <span>5단계 (감성극대화)</span>
            </div>
            <p className="text-[11px] text-slate-600 bg-gray-50 p-2 rounded border border-gray-100 leading-tight">
              💡 {STYLE_LEVEL_DESCRIPTIONS[formState.styleLevel]}
            </p>
          </div>
        </div>
      </div>

      {/* 5. Special Instructions Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>4. 사용자 추가 요청사항 (Textarea)</span>
          </label>
          <span className="text-[10px] font-bold text-red-500">
            ★ 최우선 적용 지시사항
          </span>
        </div>
        <textarea
          rows={3}
          value={formState.userRequest}
          onChange={(e) =>
            setFormState((prev) => ({ ...prev, userRequest: e.target.value }))
          }
          className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          placeholder="이번 글 작성 시 최우선 반영할 지시사항 입력 (예: 내돈내산 강조, 주차 정보 작성, 매장 오시는 길 상세 안내 등)..."
        />
      </div>

      {/* 6. Generate Button */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={isButtonDisabled}
        className={`py-4 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
          isButtonDisabled
            ? "bg-gray-200 text-gray-400 shadow-none cursor-not-allowed border border-gray-300"
            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 hover:shadow-blue-300"
        }`}
      >
        {isGenerating ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Gemini AI가 블로그 & 썸네일을 생성 중입니다...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>AI 블로그 포스트 & 썸네일 생성하기</span>
          </>
        )}
      </button>

      <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1 font-medium">
        <span>* 공용 API Key 사용 시 하루 최대 3회 무료 생성이 가능하며, 개인 API Key 입력 시 무제한 사용 가능합니다.</span>
      </p>
    </div>
  );
};
