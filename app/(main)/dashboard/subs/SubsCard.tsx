"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const Grainient = dynamic(() => import("@/components/Grainient"), {
  ssr: false,
});

export function SubsCard() {
  const [ready, setReady] = useState(false);

  // Delay fade-in slightly so the WebGL canvas can render its first frame
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-gray-900/10 backdrop-blur-xl transition-shadow duration-300 hover:shadow-lg dark:border-white/15">
      {/* Active grainient background — fades in smoothly */}
      <div
        className="absolute inset-0 z-0 overflow-hidden transition-opacity duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
        style={{ opacity: ready ? 1 : 0 }}
      >
        <Grainient
          className=""
          timeSpeed={0.6}
          grainAmount={0.08}
          contrast={1.3}
          saturation={0.8}
          zoom={0.6}
          warpSpeed={3.0}
          warpAmplitude={40}
          color1="#FF9FFC"
          color2="#5227FF"
          color3="#B19EEF"
        />
      </div>

      {/* Semi-transparent overlay so text stays readable */}
      <div className="absolute inset-0 z-[1] bg-white/70 dark:bg-gray-950/70" />

      {/* Content */}
      <div className="relative z-10 p-8">
        <h2 className="font-display text-3xl font-light text-gray-900 sm:text-4xl dark:text-white">
          Free Plan
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-900/50 dark:text-white/50">
          You&apos;re currently on the free plan. All courses, materials, and
          features are available to you at no cost.
        </p>
        <div className="mt-6 inline-flex items-baseline gap-1">
          <span className="font-display text-5xl font-light text-gray-900 sm:text-6xl dark:text-white">
            $0
          </span>
          <span className="text-base text-gray-900/40 dark:text-white/40">
            / month
          </span>
        </div>
        <div className="mt-6 flex justify-center">
          <img
            src="https://lib.thevibecodedcompany.com/images/avatar-default.webp"
            alt="Avatar"
            width={160}
            height={160}
            className="h-40 w-40 rounded-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
