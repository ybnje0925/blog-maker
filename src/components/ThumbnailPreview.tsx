import React, { useEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import html2canvas from "html2canvas";
import {
  Download,
  ImageIcon,
  Palette,
  Move,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sun,
  Moon,
} from "lucide-react";
import { ThumbnailData, UploadedPhoto } from "../types";

interface ThumbnailPreviewProps {
  thumbnailData: ThumbnailData;
  setThumbnailData: React.Dispatch<React.SetStateAction<ThumbnailData>>;
  selectedPhoto: UploadedPhoto | null;
}

type TextAlign = "left" | "center" | "right";
type BoxStyle = "transparent" | "glass" | "solid_box";

// Position/size stored as percentages of the container so the layout stays correct on resize.
interface TextBox {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  fontSize: number;
  color: string;
}

const PRESETS: Record<
  ThumbnailData["layout_position"],
  { main: Omit<TextBox, "fontSize" | "color">; sub: Omit<TextBox, "fontSize" | "color"> }
> = {
  CENTER: {
    main: { xPct: 10, yPct: 40, widthPct: 80, heightPct: 16 },
    sub: { xPct: 10, yPct: 58, widthPct: 80, heightPct: 10 },
  },
  TOP_BANNER: {
    main: { xPct: 6, yPct: 8, widthPct: 88, heightPct: 16 },
    sub: { xPct: 6, yPct: 26, widthPct: 88, heightPct: 10 },
  },
  BOTTOM_LEFT: {
    main: { xPct: 6, yPct: 64, widthPct: 75, heightPct: 16 },
    sub: { xPct: 6, yPct: 82, widthPct: 75, heightPct: 10 },
  },
};

export const ThumbnailPreview: React.FC<ThumbnailPreviewProps> = ({
  thumbnailData,
  setThumbnailData,
  selectedPhoto,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 500, height: 500 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:3" | "16:9">("1:1");
  const [boxStyle, setBoxStyle] = useState<BoxStyle>("transparent");
  const [darkOverlayOn, setDarkOverlayOn] = useState(true);
  const [textAlign, setTextAlign] = useState<TextAlign>("center");

  const [mainBox, setMainBox] = useState<TextBox>({
    ...PRESETS.CENTER.main,
    fontSize: 30,
    color: "#ffffff",
  });
  const [subBox, setSubBox] = useState<TextBox>({
    ...PRESETS.CENTER.sub,
    fontSize: 15,
    color: "#fde047",
  });

  // Track the live rendered size of the stage so drag/position math (stored as %) stays accurate.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Re-apply a preset layout (used on first mount and via the "위치 프리셋" buttons)
  const applyPreset = (position: ThumbnailData["layout_position"]) => {
    const preset = PRESETS[position];
    setMainBox((prev) => ({ ...prev, ...preset.main }));
    setSubBox((prev) => ({ ...prev, ...preset.sub }));
    setThumbnailData((prev) => ({ ...prev, layout_position: position }));
  };

  const handleDownloadThumbnail = async () => {
    if (!containerRef.current) return;
    try {
      setIsDownloading(true);
      const canvas = await html2canvas(containerRef.current, {
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

  const boxStyleClass =
    boxStyle === "glass"
      ? "bg-slate-900/60 backdrop-blur-md border border-white/20 shadow-2xl"
      : boxStyle === "solid_box"
      ? "bg-slate-900/90 border border-slate-700 shadow-2xl"
      : "bg-transparent";

  const alignClass = textAlign === "left" ? "text-left" : textAlign === "right" ? "text-right" : "text-center";
  const alignItemsClass =
    textAlign === "left" ? "items-start" : textAlign === "right" ? "items-end" : "items-center";

  const pxBox = (box: TextBox) => ({
    x: (box.xPct / 100) * containerSize.width,
    y: (box.yPct / 100) * containerSize.height,
    width: (box.widthPct / 100) * containerSize.width,
    height: (box.heightPct / 100) * containerSize.height,
  });

  const updateBoxPositionPct = (
    setBox: React.Dispatch<React.SetStateAction<TextBox>>,
    x: number,
    y: number
  ) => {
    if (containerSize.width === 0 || containerSize.height === 0) return;
    setBox((prev) => ({
      ...prev,
      xPct: (x / containerSize.width) * 100,
      yPct: (y / containerSize.height) * 100,
    }));
  };

  const mainPx = pxBox(mainBox);
  const subPx = pxBox(subBox);

  return (
    <div className="space-y-6">
      {/* Controls & Customizer Panel */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-blue-600" />
            <span>썸네일 카피 & 디자인 커스텀</span>
          </h3>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Move className="w-3 h-3" />
            텍스트를 드래그해서 위치 조정
          </span>
        </div>

        {/* Copy text inputs */}
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

        {/* Font size sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-slate-600">메인 폰트 크기</label>
              <span className="text-[11px] text-blue-600 font-semibold">{mainBox.fontSize}px</span>
            </div>
            <input
              type="range"
              min={14}
              max={56}
              step={1}
              value={mainBox.fontSize}
              onChange={(e) => setMainBox((prev) => ({ ...prev, fontSize: parseInt(e.target.value, 10) }))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-slate-600">서브 폰트 크기</label>
              <span className="text-[11px] text-blue-600 font-semibold">{subBox.fontSize}px</span>
            </div>
            <input
              type="range"
              min={10}
              max={32}
              step={1}
              value={subBox.fontSize}
              onChange={(e) => setSubBox((prev) => ({ ...prev, fontSize: parseInt(e.target.value, 10) }))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>

        {/* Color pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">메인 텍스트 색상</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={mainBox.color}
                onChange={(e) => setMainBox((prev) => ({ ...prev, color: e.target.value }))}
                className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer bg-transparent"
              />
              <span className="text-[11px] font-mono text-slate-500">{mainBox.color}</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">서브 텍스트 색상</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={subBox.color}
                onChange={(e) => setSubBox((prev) => ({ ...prev, color: e.target.value }))}
                className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer bg-transparent"
              />
              <span className="text-[11px] font-mono text-slate-500">{subBox.color}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Dark overlay toggle */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">배경 어둡게(오버레이)</label>
            <button
              type="button"
              onClick={() => setDarkOverlayOn((prev) => !prev)}
              className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                darkOverlayOn
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "bg-gray-50 border-gray-200 text-slate-600"
              }`}
            >
              {darkOverlayOn ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              <span>{darkOverlayOn ? "오버레이 ON" : "오버레이 OFF"}</span>
            </button>
          </div>

          {/* Text alignment */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">텍스트 정렬</label>
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              {(
                [
                  { id: "left" as const, icon: AlignLeft },
                  { id: "center" as const, icon: AlignCenter },
                  { id: "right" as const, icon: AlignRight },
                ]
              ).map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTextAlign(id)}
                  className={`flex-1 py-1 flex items-center justify-center rounded-md transition cursor-pointer ${
                    textAlign === id ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Layout Position Preset */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">
              위치 프리셋 (드래그로 자유 조정 가능)
            </label>
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              {(
                [
                  { id: "CENTER" as const, label: "중앙" },
                  { id: "BOTTOM_LEFT" as const, label: "좌측 하단" },
                  { id: "TOP_BANNER" as const, label: "상단 배너" },
                ]
              ).map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => applyPreset(pos.id)}
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

          {/* Text box background style */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">
              텍스트 박스 스타일
            </label>
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              {(
                [
                  { id: "transparent" as const, label: "투명" },
                  { id: "glass" as const, label: "글래스" },
                  { id: "solid_box" as const, label: "박스" },
                ]
              ).map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setBoxStyle(style.id)}
                  className={`flex-1 py-1 text-[11px] font-medium rounded-md transition cursor-pointer ${
                    boxStyle === style.id
                      ? "bg-white text-blue-600 font-bold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Thumbnail Render Stage */}
      <div className="flex flex-col items-center justify-center space-y-4">
        <div
          ref={containerRef}
          className={`w-full ${aspectClasses[aspectRatio]} relative overflow-hidden rounded-xl shadow-xl bg-slate-900 select-none transition-all duration-300`}
        >
          {selectedPhoto ? (
            <img
              src={selectedPhoto.previewUrl}
              alt="썸네일 배경 이미지"
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-6 text-slate-400 pointer-events-none">
              <ImageIcon className="w-12 h-12 mb-2 text-blue-400 opacity-60" />
              <p className="text-xs text-blue-200">
                업로드된 대표 사진이 없습니다.
              </p>
            </div>
          )}

          {darkOverlayOn && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20 pointer-events-none" />
          )}

          <Rnd
            size={{ width: mainPx.width, height: mainPx.height }}
            position={{ x: mainPx.x, y: mainPx.y }}
            onDragStop={(_e, d) => updateBoxPositionPct(setMainBox, d.x, d.y)}
            enableResizing={false}
            bounds="parent"
            className="flex"
          >
            <div className={`w-full h-full flex ${alignItemsClass} justify-center px-4 py-2 rounded-xl ${boxStyleClass}`}>
              <h2
                style={{ fontSize: mainBox.fontSize, color: mainBox.color }}
                className={`w-full font-black tracking-tight leading-tight drop-shadow-md break-keep ${alignClass}`}
              >
                {thumbnailData.thumbnail_main_text || "메인 썸네일 타이틀"}
              </h2>
            </div>
          </Rnd>

          <Rnd
            size={{ width: subPx.width, height: subPx.height }}
            position={{ x: subPx.x, y: subPx.y }}
            onDragStop={(_e, d) => updateBoxPositionPct(setSubBox, d.x, d.y)}
            enableResizing={false}
            bounds="parent"
            className="flex"
          >
            <div className={`w-full h-full flex ${alignItemsClass} justify-center px-4 py-1 rounded-xl ${boxStyleClass}`}>
              <p
                style={{ fontSize: subBox.fontSize, color: subBox.color }}
                className={`w-full font-semibold tracking-wide break-keep drop-shadow-xs ${alignClass}`}
              >
                {thumbnailData.thumbnail_sub_text || "서브 부연 설명 문구"}
              </p>
            </div>
          </Rnd>
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
