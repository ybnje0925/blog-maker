import React from "react";
import { AdSlot } from "./AdSlot";

// Leaderboard banner (728x90) that scales down to a mobile banner (320x50) on small screens.
export const HeaderAdSlot: React.FC = () => {
  return (
    <div className="w-full flex justify-center mb-4">
      <div className="hidden sm:block w-full">
        <AdSlot width={728} height={90} label="상단 배너 광고" className="mx-auto" />
      </div>
      <div className="block sm:hidden w-full">
        <AdSlot width={320} height={50} label="상단 배너 광고" className="mx-auto" />
      </div>
    </div>
  );
};
