import React from "react";
import { AdSlot } from "./AdSlot";

// Rectangle (300x250) on narrow viewports, leaderboard (728x90) once there's room beneath the preview.
export const FooterAdSlot: React.FC = () => {
  return (
    <div className="w-full flex justify-center pt-2 mt-2 border-t border-gray-100">
      <div className="hidden sm:block">
        <AdSlot width={728} height={90} label="하단 배너 광고" />
      </div>
      <div className="block sm:hidden">
        <AdSlot width={300} height={250} label="하단 사각 광고" />
      </div>
    </div>
  );
};
