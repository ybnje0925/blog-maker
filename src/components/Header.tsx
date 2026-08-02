import React from "react";
import { Link } from "react-router-dom";
import { Key, RefreshCw, ShieldCheck } from "lucide-react";

interface HeaderProps {
  onReset: () => void;
  isGenerating: boolean;
  hasCustomKey: boolean;
  usesRemaining: number;
}

export const Header: React.FC<HeaderProps> = ({ onReset, isGenerating, hasCustomKey, usesRemaining }) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur sm:px-8">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-sm font-black text-white">BD</div>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-950">
              BlogDraft
              <span className="hidden rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 sm:inline">
                AI 블로그 초안 & 썸네일 에디터
              </span>
            </h1>
            <p className="hidden text-xs text-slate-500 sm:block">AI가 정리하고, 내가 완성합니다.</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-4 text-xs font-bold text-slate-600 md:flex">
          <Link to="/" className="hover:text-blue-700">초안 만들기</Link>
          <Link to="/guide" className="hover:text-blue-700">블로그 작성 가이드</Link>
          <Link to="/about" className="hover:text-blue-700">서비스 소개</Link>
        </nav>

        <div className="flex items-center gap-2">
          {hasCustomKey ? (
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 sm:flex">
              <ShieldCheck className="h-3.5 w-3.5" />
              개인 API Key
            </div>
          ) : (
            <div className="hidden items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 sm:flex">
              <Key className="h-3.5 w-3.5" />
              오늘 남은 생성 {usesRemaining}/3
            </div>
          )}
          <button type="button" onClick={onReset} disabled={isGenerating} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-200 hover:text-slate-950 disabled:opacity-50" title="입력과 결과 초기화">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">초기화</span>
          </button>
        </div>
      </div>
    </header>
  );
};
