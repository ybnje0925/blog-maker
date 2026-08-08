import React from "react";
import { Megaphone } from "lucide-react";

interface AdSlotProps {
  width: number;
  height: number;
  label?: string;
  className?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ width, height, label, className = "" }) => {
  const showPlaceholder = !import.meta.env.PROD || import.meta.env.VITE_SHOW_AD_PLACEHOLDERS === "true";
  if (!showPlaceholder) return null;

  return (
    <div
      className={`flex w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/80 text-slate-400 ${className}`}
      style={{ maxWidth: width, aspectRatio: `${width} / ${height}` }}
      data-ad-slot-placeholder="true"
      data-ad-width={width}
      data-ad-height={height}
    >
      <div className="flex flex-col items-center gap-1 py-2 text-center">
        <Megaphone className="h-4 w-4" />
        <span className="text-[10px] font-bold tracking-wide">DEV AD PLACEHOLDER ({width}x{height})</span>
        {label && <span className="text-[10px] font-medium">{label}</span>}
      </div>
    </div>
  );
};
