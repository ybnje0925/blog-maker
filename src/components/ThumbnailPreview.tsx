import React, { useEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import html2canvas from "html2canvas";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Download,
  ImageIcon,
  Moon,
  Move,
  Palette,
  RefreshCw,
  Sun,
  Type,
} from "lucide-react";
import { ThumbnailData, UploadedPhoto } from "../types";

interface ThumbnailPreviewProps {
  thumbnailData: ThumbnailData;
  setThumbnailData: React.Dispatch<React.SetStateAction<ThumbnailData>>;
  selectedPhoto: UploadedPhoto | null;
  onRecommendCopy?: () => Promise<void>;
}

type TextAlign = "left" | "center" | "right";
type BoxStyle = "transparent" | "shadow" | "glass" | "solid";
type FontFamily = "sans" | "serif" | "rounded";

interface TextBox {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  fontSize: number;
  color: string;
}

const PRESETS: Record<ThumbnailData["layout_position"], { main: Omit<TextBox, "fontSize" | "color">; sub: Omit<TextBox, "fontSize" | "color"> }> = {
  CENTER: {
    main: { xPct: 10, yPct: 39, widthPct: 80, heightPct: 16 },
    sub: { xPct: 10, yPct: 58, widthPct: 80, heightPct: 10 },
  },
  TOP_BANNER: {
    main: { xPct: 6, yPct: 8, widthPct: 88, heightPct: 16 },
    sub: { xPct: 6, yPct: 26, widthPct: 88, heightPct: 10 },
  },
  BOTTOM_LEFT: {
    main: { xPct: 6, yPct: 63, widthPct: 75, heightPct: 16 },
    sub: { xPct: 6, yPct: 82, widthPct: 75, heightPct: 10 },
  },
};

const RECOMMENDED_COPY = [
  ["직접 다녀온 기록", "사진으로 정리한 하루"],
  ["오늘의 솔직 후기", "좋았던 점부터 아쉬운 점까지"],
  ["한눈에 보는 리뷰", "방문 전 확인하면 좋은 내용"],
  ["내 취향으로 정리한 글", "초안에 경험을 더해 완성"],
];

const EDITOR_STORAGE_KEY = "blogdraft_thumbnail_editor_state_v1";

export const ThumbnailPreview: React.FC<ThumbnailPreviewProps> = ({ thumbnailData, setThumbnailData, selectedPhoto, onRecommendCopy }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 500, height: 500 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:3" | "16:9">("1:1");
  const [boxStyle, setBoxStyle] = useState<BoxStyle>("shadow");
  const [darkOverlayOn, setDarkOverlayOn] = useState(true);
  const [textAlign, setTextAlign] = useState<TextAlign>("center");
  const [fontFamily, setFontFamily] = useState<FontFamily>("sans");
  const [copyIndex, setCopyIndex] = useState(0);
  const [isRecommending, setIsRecommending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [mainBox, setMainBox] = useState<TextBox>({ ...PRESETS.CENTER.main, fontSize: 34, color: "#ffffff" });
  const [subBox, setSubBox] = useState<TextBox>({ ...PRESETS.CENTER.sub, fontSize: 16, color: "#fde68a" });

  useEffect(() => {
    const preset = PRESETS[thumbnailData.layout_position];
    if (!preset) return;
    setMainBox((prev) => ({ ...prev, ...preset.main }));
    setSubBox((prev) => ({ ...prev, ...preset.sub }));
  }, [thumbnailData.layout_position]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(EDITOR_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed.aspectRatio) setAspectRatio(parsed.aspectRatio);
      if (parsed.boxStyle) setBoxStyle(parsed.boxStyle);
      if (typeof parsed.darkOverlayOn === "boolean") setDarkOverlayOn(parsed.darkOverlayOn);
      if (parsed.textAlign) setTextAlign(parsed.textAlign);
      if (parsed.fontFamily) setFontFamily(parsed.fontFamily);
      if (parsed.mainBox) setMainBox(parsed.mainBox);
      if (parsed.subBox) setSubBox(parsed.subBox);
    } catch {
      localStorage.removeItem(EDITOR_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        EDITOR_STORAGE_KEY,
        JSON.stringify({ aspectRatio, boxStyle, darkOverlayOn, textAlign, fontFamily, mainBox, subBox })
      );
    } catch {
      setStatusMessage("썸네일 편집 설정을 브라우저에 저장하지 못했습니다. 저장 공간을 확인해 주세요.");
    }
  }, [aspectRatio, boxStyle, darkOverlayOn, textAlign, fontFamily, mainBox, subBox]);

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

  const applyPreset = (position: ThumbnailData["layout_position"]) => {
    const preset = PRESETS[position];
    setMainBox((prev) => ({ ...prev, ...preset.main }));
    setSubBox((prev) => ({ ...prev, ...preset.sub }));
    setThumbnailData((prev) => ({ ...prev, layout_position: position }));
  };

  const recommendCopy = async () => {
    setStatusMessage(null);
    if (onRecommendCopy) {
      try {
        setIsRecommending(true);
        await onRecommendCopy();
        setStatusMessage("썸네일 문구를 다시 추천했습니다.");
        return;
      } catch (error: any) {
        setStatusMessage(error?.message || "썸네일 문구 재추천 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setIsRecommending(false);
      }
    }

    const nextIndex = (copyIndex + 1) % RECOMMENDED_COPY.length;
    setCopyIndex(nextIndex);
    const [main, sub] = RECOMMENDED_COPY[nextIndex];
    setThumbnailData((prev) => ({ ...prev, thumbnail_main_text: main, thumbnail_sub_text: sub }));
    setStatusMessage("썸네일 문구 후보를 바꿨습니다.");
  };

  const handleDownloadThumbnail = async () => {
    if (!containerRef.current) return;
    setStatusMessage(null);
    try {
      setIsDownloading(true);
      const canvas = await html2canvas(containerRef.current, { useCORS: true, allowTaint: true, scale: 2, backgroundColor: null });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `blogdraft_thumbnail_${Date.now()}.png`;
      link.click();
      setStatusMessage("썸네일 이미지를 저장했습니다.");
    } catch {
      setStatusMessage("썸네일 이미지 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsDownloading(false);
    }
  };

  const aspectClasses = {
    "1:1": "aspect-square max-w-[500px]",
    "4:3": "aspect-[4/3] max-w-[560px]",
    "16:9": "aspect-video max-w-[640px]",
  };

  const fontClass = fontFamily === "serif" ? "font-serif" : fontFamily === "rounded" ? "font-sans" : "font-sans";
  const alignClass = textAlign === "left" ? "text-left" : textAlign === "right" ? "text-right" : "text-center";
  const alignItemsClass = textAlign === "left" ? "items-start" : textAlign === "right" ? "items-end" : "items-center";
  const boxClass = boxStyle === "glass" ? "bg-slate-950/55 backdrop-blur-md border border-white/20" : boxStyle === "solid" ? "bg-slate-950/90" : boxStyle === "shadow" ? "text-shadow-strong" : "bg-transparent";

  const pxBox = (box: TextBox) => ({
    x: (box.xPct / 100) * containerSize.width,
    y: (box.yPct / 100) * containerSize.height,
    width: (box.widthPct / 100) * containerSize.width,
    height: (box.heightPct / 100) * containerSize.height,
  });

  const updateBoxPositionPct = (setBox: React.Dispatch<React.SetStateAction<TextBox>>, x: number, y: number) => {
    if (!containerSize.width || !containerSize.height) return;
    setBox((prev) => ({ ...prev, xPct: (x / containerSize.width) * 100, yPct: (y / containerSize.height) * 100 }));
  };

  const mainPx = pxBox(mainBox);
  const subPx = pxBox(subBox);

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-950">
            <Palette className="h-4 w-4 text-blue-700" />
            썸네일 문구와 디자인 편집
          </h3>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Move className="h-3.5 w-3.5" />
            텍스트를 드래그해 위치를 조정하세요.
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-bold text-slate-700">
            메인 문구
            <input value={thumbnailData.thumbnail_main_text} onChange={(event) => setThumbnailData((prev) => ({ ...prev, thumbnail_main_text: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="space-y-1 text-xs font-bold text-slate-700">
            서브 문구
            <input value={thumbnailData.thumbnail_sub_text} onChange={(event) => setThumbnailData((prev) => ({ ...prev, thumbnail_sub_text: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ControlRange label="메인 글자 크기" value={mainBox.fontSize} min={16} max={58} onChange={(value) => setMainBox((prev) => ({ ...prev, fontSize: value }))} />
          <ControlRange label="서브 글자 크기" value={subBox.fontSize} min={10} max={34} onChange={(value) => setSubBox((prev) => ({ ...prev, fontSize: value }))} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ColorControl label="메인 색상" value={mainBox.color} onChange={(value) => setMainBox((prev) => ({ ...prev, color: value }))} />
          <ColorControl label="서브 색상" value={subBox.color} onChange={(value) => setSubBox((prev) => ({ ...prev, color: value }))} />
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">글꼴</label>
            <select value={fontFamily} onChange={(event) => setFontFamily(event.target.value as FontFamily)} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none focus:border-blue-400">
              <option value="sans">깔끔한 고딕</option>
              <option value="rounded">부드러운 고딕</option>
              <option value="serif">차분한 명조</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ToggleButton active={darkOverlayOn} onClick={() => setDarkOverlayOn((prev) => !prev)} activeLabel="배경 어둡게 ON" inactiveLabel="배경 어둡게 OFF" activeIcon={<Moon className="h-3.5 w-3.5" />} inactiveIcon={<Sun className="h-3.5 w-3.5" />} />
          <Segmented label="정렬" value={textAlign} options={[
            { id: "left", label: "왼쪽", icon: AlignLeft },
            { id: "center", label: "가운데", icon: AlignCenter },
            { id: "right", label: "오른쪽", icon: AlignRight },
          ]} onChange={(value) => setTextAlign(value as TextAlign)} />
          <Segmented label="비율" value={aspectRatio} options={[
            { id: "1:1", label: "1:1" },
            { id: "4:3", label: "4:3" },
            { id: "16:9", label: "16:9" },
          ]} onChange={(value) => setAspectRatio(value as "1:1" | "4:3" | "16:9")} />
          <Segmented label="텍스트 배경" value={boxStyle} options={[
            { id: "shadow", label: "그림자" },
            { id: "glass", label: "반투명" },
            { id: "solid", label: "박스" },
          ]} onChange={(value) => setBoxStyle(value as BoxStyle)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Segmented label="배치" value={thumbnailData.layout_position} options={[
            { id: "CENTER", label: "중앙" },
            { id: "BOTTOM_LEFT", label: "좌하단" },
            { id: "TOP_BANNER", label: "상단" },
          ]} onChange={(value) => applyPreset(value as ThumbnailData["layout_position"])} />
          <button type="button" onClick={recommendCopy} disabled={isRecommending} className="flex h-[62px] items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 text-xs font-black text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${isRecommending ? "animate-spin" : ""}`} />
            {isRecommending ? "문구 추천 중" : "문구 다시 추천받기"}
          </button>
        </div>
      </section>

      <section className="flex flex-col items-center gap-4">
        <div ref={containerRef} className={`relative w-full overflow-hidden rounded-lg bg-slate-950 shadow-xl ${aspectClasses[aspectRatio]}`}>
          {selectedPhoto ? (
            <img src={selectedPhoto.previewUrl} alt="썸네일 배경 이미지" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-slate-900 p-6 text-blue-100">
              <ImageIcon className="mb-2 h-12 w-12 text-blue-300" />
              <p className="text-sm font-bold">대표 사진을 선택하면 썸네일 배경으로 표시됩니다.</p>
            </div>
          )}

          {darkOverlayOn && <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />}

          <Rnd size={{ width: mainPx.width, height: mainPx.height }} position={{ x: mainPx.x, y: mainPx.y }} onDragStop={(_event, data) => updateBoxPositionPct(setMainBox, data.x, data.y)} enableResizing={false} bounds="parent" className="flex">
            <div className={`flex h-full w-full justify-center rounded-lg px-4 py-2 ${alignItemsClass} ${boxClass}`}>
              <h2 style={{ fontSize: mainBox.fontSize, color: mainBox.color }} className={`w-full break-keep font-black leading-tight ${fontClass} ${alignClass}`}>
                {thumbnailData.thumbnail_main_text || "메인 문구"}
              </h2>
            </div>
          </Rnd>

          <Rnd size={{ width: subPx.width, height: subPx.height }} position={{ x: subPx.x, y: subPx.y }} onDragStop={(_event, data) => updateBoxPositionPct(setSubBox, data.x, data.y)} enableResizing={false} bounds="parent" className="flex">
            <div className={`flex h-full w-full justify-center rounded-lg px-4 py-1 ${alignItemsClass} ${boxClass}`}>
              <p style={{ fontSize: subBox.fontSize, color: subBox.color }} className={`w-full break-keep font-bold leading-snug ${fontClass} ${alignClass}`}>
                {thumbnailData.thumbnail_sub_text || "서브 문구"}
              </p>
            </div>
          </Rnd>
        </div>

        <button type="button" onClick={handleDownloadThumbnail} disabled={isDownloading} className="flex w-full max-w-[500px] items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 py-3.5 text-sm font-black text-white transition hover:bg-blue-800 disabled:opacity-50">
          {isDownloading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              이미지 저장 준비 중
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              결과 이미지 저장
            </>
          )}
        </button>
        {statusMessage && (
          <p role="status" className="w-full max-w-[500px] rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
            {statusMessage}
          </p>
        )}
      </section>
    </div>
  );
};

function ControlRange({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="space-y-1 text-xs font-bold text-slate-700">
      <span className="flex items-center justify-between">
        {label}
        <span className="text-blue-700">{value}px</span>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(parseInt(event.target.value, 10))} className="w-full accent-blue-700" />
    </label>
  );
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1 text-xs font-bold text-slate-700">
      {label}
      <span className="flex items-center gap-2">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-10 cursor-pointer rounded-lg border border-slate-200 bg-transparent" />
        <span className="font-mono text-slate-500">{value}</span>
      </span>
    </label>
  );
}

function ToggleButton({ active, onClick, activeLabel, inactiveLabel, activeIcon, inactiveIcon }: { active: boolean; onClick: () => void; activeLabel: string; inactiveLabel: string; activeIcon: React.ReactNode; inactiveIcon: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`flex h-[62px] items-center justify-center gap-2 rounded-lg border px-2 text-xs font-black transition ${active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
      {active ? activeIcon : inactiveIcon}
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}

function Segmented({ label, value, options, onChange }: { label: string; value: string; options: Array<{ id: string; label: string; icon?: React.ComponentType<{ className?: string }> }>; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-xs font-bold text-slate-700">
        <Type className="h-3.5 w-3.5 text-blue-700" />
        {label}
      </label>
      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
        {options.map(({ id, label: optionLabel, icon: Icon }) => (
          <button key={id} type="button" onClick={() => onChange(id)} className={`flex min-h-8 flex-1 items-center justify-center gap-1 rounded-md px-1 text-[11px] font-bold transition ${value === id ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
