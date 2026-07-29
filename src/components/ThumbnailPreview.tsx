import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Download, ImageIcon, Palette } from "lucide-react";
import { ThumbnailData, UploadedPhoto } from "../types";

interface ThumbnailPreviewProps {
  thumbnailData: ThumbnailData;
  setThumbnailData: React.Dispatch<React.SetStateAction<ThumbnailData>>;
  selectedPhoto: UploadedPhoto | null;
}

export const ThumbnailPreview: React.FC<ThumbnailPreviewProps> = ({
  thumbnailData,
  setThumbnailData,
  selectedPhoto,
}) => {
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:3" | "16:9">("1:1");
  const [overlayStyle, setOverlayStyle] = useState<
    "dark_gradient" | "glass" | "solid_box"
  >("dark_gradient");

  // Handle html2canvas download
  const handleDownloadThumbnail = async () => {
    if (!thumbnailRef.current) return;
    try {
      setIsDownloading(true);
      const canvas = await html2canvas(thumbnailRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: null,
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `blog_thumbnail_${Date.now()}.png`;
      link.click();
    } catch (err) {
      console.error("Failed to render thumbnail canvas:", err);
      alert("썸네일 이미지 다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  const aspectClasses = {
    "1:1": "aspect-square max-w-[500px]",
    "4:3": "aspect-4/3 max-w-[550px]",
    "16:9": "aspect-16/9 max-w-[600px]",
  };

  return (
    <div className="space-y-6">
      {/* Controls & Customizer Panel */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-blue-600" />
            <span>썸네일 카피 & 디자인 커스텀</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            실시간 인터랙티브 수정
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              메인 카피 (15자 이내)
            </label>
            <input
              type="text"
              value={thumbnailData.thumbnail_main_text}
              onChange={(e) =>
                setThumbnailData((prev) => ({
                  ...prev,
                  thumbnail_main_text: e.target.value,
                }))
              }
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 bg-gray-50/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              서브 카피 (20자 이내)
            </label>
            <input
              type="text"
              value={thumbnailData.thumbnail_sub_text}
              onChange={(e) =>
                setThumbnailData((prev) => ({
                  ...prev,
                  thumbnail_sub_text: e.target.value,
                }))
              }
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-gray-50/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Layout Position */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">
              배치 위치 (Position)
            </label>
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              {(
                [
                  { id: "CENTER", label: "중앙" },
                  { id: "BOTTOM_LEFT", label: "좌측 하단" },
                  { id: "TOP_BANNER", label: "상단 배너" },
                ] as const
              ).map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() =>
                    setThumbnailData((prev) => ({
                      ...prev,
                      layout_position: pos.id,
                    }))
                  }
                  className={`flex-1 py-1 text-[11px] font-medium rounded-md transition cursor-pointer ${
                    thumbnailData.layout_position === pos.id
                      ? "bg-white text-blue-600 font-bold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">
              비율 (Aspect Ratio)
            </label>
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              {(["1:1", "4:3", "16:9"] as const).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio)}
                  className={`flex-1 py-1 text-[11px] font-medium rounded-md transition cursor-pointer ${
                    aspectRatio === ratio
                      ? "bg-white text-blue-600 font-bold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          {/* Overlay Style */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">
              테마 스타일 (Style)
            </label>
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              {(
                [
                  { id: "dark_gradient", label: "그라데이션" },
                  { id: "glass", label: "글래스" },
                  { id: "solid_box", label: "박스" },
                ] as const
              ).map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setOverlayStyle(theme.id as any)}
                  className={`flex-1 py-1 text-[11px] font-medium rounded-md transition cursor-pointer ${
                    overlayStyle === theme.id
                      ? "bg-white text-blue-600 font-bold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Thumbnail Render Stage */}
      <div className="flex flex-col items-center justify-center space-y-4">
        <div
          ref={thumbnailRef}
          className={`w-full ${aspectClasses[aspectRatio]} relative overflow-hidden rounded-xl shadow-xl bg-slate-900 select-none transition-all duration-300`}
        >
          {selectedPhoto ? (
            <img
              src={selectedPhoto.previewUrl}
              alt="썸네일 배경 이미지"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-6 text-slate-400">
              <ImageIcon className="w-12 h-12 mb-2 text-blue-400 opacity-60" />
              <p className="text-xs text-blue-200">
                업로드된 대표 사진이 없습니다.
              </p>
            </div>
          )}

          {overlayStyle === "dark_gradient" && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
          )}

          <div
            className={`absolute inset-0 p-6 flex flex-col justify-between ${
              thumbnailData.layout_position === "CENTER"
                ? "items-center justify-center text-center"
                : thumbnailData.layout_position === "TOP_BANNER"
                ? "items-start justify-start text-left"
                : "items-start justify-end text-left"
            }`}
          >
            <div
              className={`p-5 rounded-xl max-w-[90%] transition-all ${
                overlayStyle === "glass"
                  ? "bg-slate-900/60 backdrop-blur-md border border-white/20 shadow-2xl text-white"
                  : overlayStyle === "solid_box"
                  ? "bg-slate-900/90 border border-slate-700 text-white shadow-2xl"
                  : "bg-transparent text-white drop-shadow-md"
              }`}
            >
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight drop-shadow-md break-keep">
                {thumbnailData.thumbnail_main_text || "메인 썸네일 타이틀"}
              </h2>

              <p className="mt-2 text-xs sm:text-sm font-semibold text-yellow-300 opacity-95 tracking-wide break-keep drop-shadow-xs">
                {thumbnailData.thumbnail_sub_text || "서브 부연 설명 문구"}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadThumbnail}
          disabled={isDownloading}
          className="w-full max-w-[500px] py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isDownloading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>썸네일 이미지 변환 중...</span>
            </>
          ) : (
            <>
              <Download className="w-4.5 h-4.5" />
              <span>🖼️ 썸네일 이미지 다운로드 (PNG)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
