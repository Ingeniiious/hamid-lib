import { LandingNoiseOverlay } from "@/components/landing/LandingNoiseOverlay";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHeroBook } from "@/components/landing/LandingHeroBook";
import { LandingValueBlock } from "@/components/landing/LandingValueBlock";
import { LandingCutMat } from "@/components/landing/LandingCutMat";
import { LandingChecklist } from "@/components/landing/LandingChecklist";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingReactPage() {
  return (
    <>
      <LandingNoiseOverlay />
      <div className="relative z-[2]">
        <LandingNav />
        <LandingHeroBook />
        <LandingValueBlock />
        <LandingCutMat />
        <LandingChecklist />
        <LandingFooter />
      </div>
    </>
  );
}
