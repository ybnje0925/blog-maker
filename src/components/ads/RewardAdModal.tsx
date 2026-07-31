import React, { useEffect, useState } from "react";
import { Gift, X, PlayCircle, CheckCircle2 } from "lucide-react";

interface RewardAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const AD_DURATION_SECONDS = 3; // simulated stand-in for the real ~30s rewarded ad playback

export const RewardAdModal: React.FC<RewardAdModalProps> = ({ isOpen, onClose, onComplete }) => {
  const [secondsLeft, setSecondsLeft] = useState(AD_DURATION_SECONDS);

  useEffect(() => {
    if (!isOpen) return;
    setSecondsLeft(AD_DURATION_SECONDS);

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const isReady = secondsLeft <= 0;
  const progressPct = ((AD_DURATION_SECONDS - secondsLeft) / AD_DURATION_SECONDS) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-4 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 cursor-pointer"
          title="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-2 pt-2">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
            <Gift className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">무료 생성권 받기</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            30초 광고를 시청하고 블로그 글 1회 무료 생성권을 받으세요.
          </p>
        </div>

        {/* Ad placeholder area */}
        <div className="aspect-video w-full bg-slate-900 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 relative overflow-hidden">
          <PlayCircle className={`w-10 h-10 ${isReady ? "text-emerald-400" : "text-white/70"}`} />
          <span className="text-[11px] font-medium">
            {isReady ? "광고 시청 완료" : "광고 재생 중 (실제 연동 시 SDK 삽입)"}
          </span>
          <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all" style={{ width: `${progressPct}%` }} />
        </div>

        <button
          type="button"
          onClick={onComplete}
          disabled={!isReady}
          className={`w-full py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
            isReady
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isReady ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>광고 시청 완료 후 생성하기</span>
            </>
          ) : (
            <span>광고 재생 중... ({secondsLeft}초)</span>
          )}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full text-[11px] text-slate-400 hover:text-slate-600 text-center cursor-pointer"
        >
          취소하고 닫기
        </button>
      </div>
    </div>
  );
};
