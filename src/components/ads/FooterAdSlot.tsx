import React from "react";
import { AdSlot } from "./AdSlot";

export const FooterAdSlot: React.FC = () => {
  return (
    <div className="mt-4 flex w-full justify-center border-t border-slate-100 pt-4">
      <div className="hidden sm:block">
        <AdSlot width={728} height={90} label="하단 728x90 광고 영역" />
      </div>
      <div className="block sm:hidden">
        <AdSlot width={300} height={250} label="하단 300x250 광고 영역" />
      </div>
    </div>
  );
};
