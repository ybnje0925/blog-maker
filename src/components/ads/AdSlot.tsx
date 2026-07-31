import React from "react";
import { Megaphone } from "lucide-react";

interface AdSlotProps {
  width: number;
  height: number;
  label?: string;
  className?: string;
}

// Generic ad placeholder. Swap the inner content for a real AdSense <ins> tag
// or Kakao AdFit <ins class="kakao_ad_area"> block once units are issued —
// this box only reserves the layout space and visual footprint for now.
export const AdSlot: React.FC<AdSlotProps> = ({ width, height, label, className = "" }) => {
  return (
    <div
      className={`w-full flex items-center justify-center border border-dashed border-gray-300 bg-gray-50/80 rounded-lg text-slate-400 ${className}`}
      style={{ maxWidth: width, aspectRatio: `${width} / ${height}` }}
      data-ad-slot-placeholder="true"
      data-ad-width={width}
      data-ad-height={height}
    >
      <div className="flex flex-col items-center gap-1 py-2">
        <Megaphone className="w-4 h-4" />
        <span className="text-[10px] font-semibold tracking-wide">
          {label || "광고 영역"} ({width}x{height})
        </span>
      </div>
    </div>
  );
};
