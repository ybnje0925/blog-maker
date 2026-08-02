import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, ClipboardCheck, Copy, Download, FileText, ImageIcon } from "lucide-react";
import { UploadedPhoto } from "../types";

interface BlogPreviewProps {
  content: string;
  onContentChange: (content: string) => void;
  photos: UploadedPhoto[];
}

const CHECKLIST_ITEMS = [
  "실제 경험이나 개인적인 의견을 추가했나요?",
  "가격, 위치, 운영시간 등 사실 정보를 확인했나요?",
  "내 말투와 어울리지 않는 문장을 수정했나요?",
  "사진의 순서와 글의 흐름이 자연스러운가요?",
  "반복되거나 과장된 표현을 정리했나요?",
  "제목과 썸네일 문구가 실제 내용과 일치하나요?",
  "썸네일이 너무 광고처럼 보이지 않는지 확인했나요?",
  "맞춤법과 오탈자를 확인했나요?",
];

export const BlogPreview: React.FC<BlogPreviewProps> = ({ content, onContentChange, photos }) => {
  const [copied, setCopied] = useState(false);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

  const plainTextLength = useMemo(() => {
    let text = content;
    text = text.replace(/(!?\[사진(?:그리드|슬라이드)?\s*:?\s*[\d,\s]+\])/g, "");
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
    text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
    text = text.replace(/^#{1,6}\s+/gm, "");
    text = text.replace(/^\s*[-*+]\s+/gm, "");
    text = text.replace(/^\s*\d+\.\s+/gm, "");
    text = text.replace(/`([^`]*)`/g, "$1");
    text = text.replace(/(\*\*\*|\*\*|\*|___|__|_|~~)/g, "");
    return text.replace(/\s+/g, " ").trim().length;
  }, [content]);

  if (!content) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <FileText className="h-7 w-7" />
        </div>
        <h3 className="text-base font-black text-slate-950">아직 생성된 블로그 초안이 없습니다.</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
          사진, 말투 참고자료, 추가 요청사항을 입력하면 AI가 수정하기 쉬운 마크다운 초안을 만들고 사진 배치까지 제안합니다.
        </p>
      </div>
    );
  }

  const copyEnabled = checkedItems.length >= 3;

  const handleCopy = async () => {
    if (!copyEnabled) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMd = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `blogdraft_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderPhotoTile = (photoNum: number, compact: boolean) => {
    const photo = photos[photoNum - 1];
    return (
      <div key={`photo-${photoNum}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
        {photo ? (
          <div className={`relative flex items-center justify-center overflow-hidden rounded-md bg-slate-100 ${compact ? "max-h-[240px]" : "max-h-[450px]"}`}>
            <img src={photo.previewUrl} alt={`본문 삽입 사진 ${photoNum}`} className="h-full w-full object-contain" />
            <span className="absolute left-2 top-2 rounded bg-slate-950/80 px-2 py-1 text-[10px] font-bold text-white">사진 {photoNum}</span>
          </div>
        ) : (
          <div className="flex min-h-32 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-slate-400">
            <ImageIcon className="mb-1 h-7 w-7" />
            <p className="text-xs">사진 {photoNum} 영역</p>
          </div>
        )}
      </div>
    );
  };

  const renderContentWithPhotos = () => {
    const photoTagRegex = /(!?\[사진(?:그리드|슬라이드)?\s*:?\s*[\d,\s]+\])/g;
    const tagDetailRegex = /^!?\[사진(그리드|슬라이드)?\s*:?\s*([\d,\s]+)\]$/;
    return content.split(photoTagRegex).map((segment, index) => {
      const match = segment.match(tagDetailRegex);
      if (!match) {
        return segment ? (
          <div key={`text-${index}`} className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{segment}</ReactMarkdown>
          </div>
        ) : null;
      }

      const layoutType = match[1];
      const photoNums = match[2].split(/[,\s]+/).map((num) => parseInt(num, 10)).filter((num) => !Number.isNaN(num) && num > 0);
      if (photoNums.length === 0) return null;

      if (!layoutType || photoNums.length === 1) {
        return <div key={`photo-block-${index}`} className="my-6">{renderPhotoTile(photoNums[0], false)}</div>;
      }

      if (layoutType === "그리드") {
        const cols = Math.min(photoNums.length, 3);
        return (
          <div key={`grid-${index}`} className="my-6 grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {photoNums.map((num) => renderPhotoTile(num, true))}
          </div>
        );
      }

      return (
        <div key={`slide-${index}`} className="my-6 flex gap-3 overflow-x-auto pb-2">
          {photoNums.map((num) => <div key={num} className="w-[75%] shrink-0 sm:w-[45%]">{renderPhotoTile(num, true)}</div>)}
        </div>
      );
    });
  };

  const toggleChecklist = (item: string) => {
    setCheckedItems((prev) => prev.includes(item) ? prev.filter((current) => current !== item) : [...prev, item]);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
            <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1">본문 글자 수: <strong className="text-slate-950">{plainTextLength}</strong></span>
            <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1">사진: <strong className="text-blue-700">{photos.length}</strong>장</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleCopy} disabled={!copyEnabled} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black transition ${copyEnabled ? "bg-blue-700 text-white hover:bg-blue-800" : "cursor-not-allowed bg-slate-200 text-slate-400"}`}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "복사 완료" : "본문 전체 복사"}
            </button>
            <button type="button" onClick={handleDownloadMd} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">
              <Download className="h-3.5 w-3.5" />
              MD 저장
            </button>
          </div>
        </div>
        {!copyEnabled && <p className="mt-2 text-xs text-slate-500">발행 전 체크리스트를 3개 이상 확인하면 복사 버튼이 활성화됩니다.</p>}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-slate-950">블로그 글 직접 수정</h3>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {[
              { id: "edit" as const, label: "수정" },
              { id: "preview" as const, label: "미리보기" },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-black ${viewMode === mode.id ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        {viewMode === "edit" ? (
          <textarea
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            rows={18}
            className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        ) : (
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-xs leading-5 text-slate-500">
            아래 미리보기에서 사진 배치와 본문 흐름을 확인할 수 있습니다.
          </div>
        )}
      </section>

      <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-950">
          <ClipboardCheck className="h-4 w-4 text-blue-700" />
          발행 전 체크리스트
        </h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {CHECKLIST_ITEMS.map((item) => (
            <label key={item} className="flex cursor-pointer items-start gap-2 rounded-md bg-white/70 p-2 text-xs leading-5 text-slate-700">
              <input type="checkbox" checked={checkedItems.includes(item)} onChange={() => toggleChecklist(item)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700" />
              {item}
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs font-medium leading-5 text-slate-700">AI가 만든 초안에 나의 경험과 표현을 더하면 더욱 자연스럽고 가치 있는 콘텐츠가 됩니다.</p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
        {renderContentWithPhotos()}
      </section>
    </div>
  );
};
