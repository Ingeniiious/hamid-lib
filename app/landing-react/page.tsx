import { LandingNoiseOverlay } from "@/components/landing/LandingNoiseOverlay";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHeroBook } from "@/components/landing/LandingHeroBook";
import { LandingValueBlock } from "@/components/landing/LandingValueBlock";
import { LandingBook } from "@/components/landing/LandingBook";
import { LandingCutMat } from "@/components/landing/LandingCutMat";
import { LandingChecklist } from "@/components/landing/LandingChecklist";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingDoodles } from "@/components/landing/LandingDoodles";

export default function LandingReactPage() {
  return (
    <>
      <LandingNoiseOverlay />
      <LandingDoodles>
        <div className="relative z-[2]">
          <LandingNav />
          <LandingHeroBook />
          <LandingValueBlock />
          <LandingBook />
          <LandingCutMat />
          <LandingChecklist />
          <LandingFooter />
        </div>
      </LandingDoodles>
    </>
  );
}
