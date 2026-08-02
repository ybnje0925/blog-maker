import React from "react";
import { AdSlot } from "./AdSlot";

export const HeaderAdSlot: React.FC = () => {
  return (
    <div className="mb-4 flex w-full justify-center">
      <div className="hidden w-full sm:block">
        <AdSlot width={728} height={90} label="Header 728x90 광고 영역" className="mx-auto" />
      </div>
      <div className="block w-full sm:hidden">
        <AdSlot width={320} height={50} label="Mobile 320x50 광고 영역" className="mx-auto" />
      </div>
    </div>
  );
};
