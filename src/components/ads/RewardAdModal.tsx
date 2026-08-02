import React, { useEffect, useState } from "react";
import { CheckCircle2, Gift, PlayCircle, X } from "lucide-react";

interface RewardAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const AD_DURATION_SECONDS = 3;

export const RewardAdModal: React.FC<RewardAdModalProps> = ({ isOpen, onClose, onComplete }) => {
  const [secondsLeft, setSecondsLeft] = useState(AD_DURATION_SECONDS);

  useEffect(() => {
    if (!isOpen) return;
    setSecondsLeft(AD_DURATION_SECONDS);
    const timer = setInterval(() => setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const isReady = secondsLeft <= 0;
  const progressPct = ((AD_DURATION_SECONDS - secondsLeft) / AD_DURATION_SECONDS) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 text-slate-400 hover:text-slate-700" title="닫기">
          <X className="h-5 w-5" />
        </button>

        <div className="pt-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-500">
            <Gift className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-black text-slate-950">무료 초안 생성권 받기</h3>
          <p className="mt-2 text-xs leading-5 text-slate-600">광고 시청 후 수정 가능한 블로그 초안과 썸네일 문구를 생성합니다.</p>
        </div>

        <div className="relative mt-4 flex aspect-video w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-lg bg-slate-900 text-slate-300">
          <PlayCircle className={`h-10 w-10 ${isReady ? "text-emerald-400" : "text-white/70"}`} />
          <span className="text-xs font-bold">{isReady ? "광고 시청 완료" : "광고 영역 재생 중"}</span>
          <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all" style={{ width: `${progressPct}%` }} />
        </div>

        <button type="button" onClick={onComplete} disabled={!isReady} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-black transition ${isReady ? "bg-blue-700 text-white hover:bg-blue-800" : "cursor-not-allowed bg-slate-100 text-slate-400"}`}>
          {isReady ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              초안 생성 시작
            </>
          ) : (
            `광고 재생 중 ${secondsLeft}초`
          )}
        </button>
      </div>
    </div>
  );
};
