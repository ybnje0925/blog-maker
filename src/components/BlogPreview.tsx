import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, Download, FileText, ImageIcon } from "lucide-react";
import { UploadedPhoto } from "../types";

interface BlogPreviewProps {
  content: string;
  photos: UploadedPhoto[];
}

export const BlogPreview: React.FC<BlogPreviewProps> = ({ content, photos }) => {
  const [copied, setCopied] = useState(false);

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[420px] border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
        <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shadow-xs">
          <FileText className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 mb-1">
          아직 생성된 블로그 포스트가 없습니다
        </h3>
        <p className="text-xs text-slate-500 max-w-sm">
          왼쪽 입력 폼에 사진 및 설정사항을 지정하고 약관 동의 후 [생성하기] 버튼을 누르면 Gemini AI가 맞춤형 마크다운 포스트를 작성합니다.
        </p>
      </div>
    );
  }

  // Copy Markdown to Clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download Markdown File
  const handleDownloadMd = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `blog_post_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // A single photo tile used inside single / grid / slide layouts
  const renderPhotoTile = (photoNum: number, compact: boolean) => {
    const photo = photos[photoNum - 1];
    const maxHeight = compact ? "max-h-[240px]" : "max-h-[450px]";

    return (
      <div
        key={`photo-tile-${photoNum}`}
        className={`p-2 bg-gray-50 border border-gray-200 rounded-xl shadow-2xs text-center space-y-1.5 group ${
          compact ? "" : "p-3 space-y-2"
        }`}
      >
        {photo ? (
          <div
            className={`relative overflow-hidden rounded-lg bg-gray-100 ${maxHeight} flex items-center justify-center`}
          >
            <img
              src={photo.previewUrl}
              alt={`본문 삽입 사진 ${photoNum}`}
              className={`${maxHeight} w-full object-contain rounded-lg`}
            />
            <span className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-xs">
              📷 [사진 {photoNum}]
            </span>
          </div>
        ) : (
          <div className="p-6 bg-gray-100/70 border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-slate-400">
            <ImageIcon className="w-8 h-8 mb-1 text-slate-300" />
            <p className="text-xs font-medium">
              [사진 {photoNum}] 영역 - 업로드된 해당 순서의 이미지가 없습니다.
            </p>
          </div>
        )}
        <p className="text-[11px] text-slate-500 italic">[사진 {photoNum}]</p>
      </div>
    );
  };

  // Parse [사진 N] / [사진그리드: n,n,n] / [사진슬라이드: n,n,n] tags and substitute with rendered image layouts
  const renderContentWithPhotos = () => {
    const photoTagRegex = /(!?\[사진(?:그리드|슬라이드)?\s*:?\s*[\d,\s]+\])/g;
    const tagDetailRegex = /^!?\[사진(그리드|슬라이드)?\s*:?\s*([\d,\s]+)\]$/;
    const parts = content.split(photoTagRegex);

    return parts.map((segment, idx) => {
      const match = segment.match(tagDetailRegex);

      if (!match) {
        if (!segment) return null;
        return (
          <div key={`md-text-${idx}`} className="markdown-body text-slate-800 leading-relaxed space-y-3">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{segment}</ReactMarkdown>
          </div>
        );
      }

      const layoutType = match[1]; // undefined | "그리드" | "슬라이드"
      const photoNums = match[2]
        .split(/[,\s]+/)
        .map((n) => parseInt(n, 10))
        .filter((n) => !isNaN(n) && n > 0);

      if (photoNums.length === 0) return null;

      // Single photo, unchanged layout
      if (!layoutType || photoNums.length === 1) {
        return (
          <div key={`photo-block-${idx}`} className="my-6">
            {renderPhotoTile(photoNums[0], false)}
          </div>
        );
      }

      // Grid layout: side-by-side comparison / detail shots
      if (layoutType === "그리드") {
        const cols = Math.min(photoNums.length, 3);
        return (
          <div key={`photo-grid-${idx}`} className="my-6 space-y-1.5">
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {photoNums.map((n) => renderPhotoTile(n, true))}
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              🖼️ 사진 {photoNums.join(", ")} 그리드 배치 ({photoNums.length}장)
            </p>
          </div>
        );
      }

      // Slide layout: sequential / process flow shots, horizontally scrollable
      return (
        <div key={`photo-slide-${idx}`} className="my-6 space-y-1.5">
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
            {photoNums.map((n) => (
              <div key={`slide-item-${n}`} className="snap-center shrink-0 w-[75%] sm:w-[45%]">
                {renderPhotoTile(n, true)}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            ← 옆으로 슬라이드하여 더보기 ({photoNums.length}장) →
          </p>
        </div>
      );
    });
  };

  // Approximate the character count of the actual published post: strip markdown syntax and photo tags
  const getPlainTextLength = (markdown: string): number => {
    let text = markdown;
    text = text.replace(/(!?\[사진(그리드|슬라이드)?\s*:?\s*[\d,\s]+\])/g, "");
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
    text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
    text = text.replace(/^#{1,6}\s+/gm, "");
    text = text.replace(/^\s*>\s?/gm, "");
    text = text.replace(/^\s*[-*+]\s+/gm, "");
    text = text.replace(/^\s*\d+\.\s+/gm, "");
    text = text.replace(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/gm, "");
    text = text.replace(/`([^`]*)`/g, "$1");
    text = text.replace(/(\*\*\*|\*\*|\*|___|__|_|~~)/g, "");
    text = text.replace(/\s+/g, " ").trim();
    return text.length;
  };

  const wordCount = getPlainTextLength(content);

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="flex items-center space-x-2 text-xs text-slate-600 font-medium">
          <span className="px-2.5 py-1 bg-white border border-gray-200 rounded-md">
            총 글자수: <strong className="text-slate-900">{wordCount}자</strong>
          </span>
          <span className="px-2.5 py-1 bg-white border border-gray-200 rounded-md">
            매핑 사진: <strong className="text-blue-600">{photos.length}장</strong>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg shadow-2xs transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">복사 완료</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>마크다운 복사</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadMd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.md 다운로드</span>
          </button>
        </div>
      </div>

      {/* Blog Article Render Container */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-xs max-w-none">
        {renderContentWithPhotos()}
      </div>
    </div>
  );
};
