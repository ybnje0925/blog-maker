import React from "react";
import { Sparkles, RefreshCw, Key, ShieldCheck } from "lucide-react";

interface HeaderProps {
  onReset: () => void;
  isGenerating: boolean;
  hasCustomKey: boolean;
  usesRemaining: number;
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
  isGenerating,
  hasCustomKey,
  usesRemaining,
}) => {
  return (
    <header className="h-16 px-4 sm:px-8 flex items-center justify-between border-b border-gray-200 bg-white sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-xs">
          A
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <span>AI Blog Studio</span>
            <span className="text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
              v1.5-flash-ready
            </span>
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            개인 전용 AI 블로그 포스트 & 썸네일 자동 생성기
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* API Usage Status Badge */}
        {hasCustomKey ? (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>개인 API Key (무제한)</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold rounded-full">
            <Key className="w-3.5 h-3.5 text-blue-600" />
            <span>오늘의 무료 잔여: {usesRemaining}/3회</span>
          </div>
        )}

        <button
          onClick={onReset}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50 cursor-pointer"
          title="모든 입력 및 결과 초기화"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">초기화</span>
        </button>
      </div>
    </header>
  );
};
