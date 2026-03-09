"use client";

import { motion } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface FeatureCardProps {
  title: string;
  description: string;
  index: number;
  font?: string;
}

export function FeatureCard({
  title,
  description,
  index,
  font = "",
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-5%" }}
      transition={{ duration: 0.6, ease, delay: index * 0.08 }}
      whileHover={{ scale: 1.02 }}
      className="h-full"
    >
      <div className="group relative h-full cursor-default overflow-hidden rounded-3xl border border-foreground/[0.06] bg-foreground/[0.02] backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg">
        {/* Grainient hover overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(255,159,252,0.18), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(82,39,255,0.15), transparent 60%), radial-gradient(ellipse at 50% 50%, rgba(177,158,239,0.12), transparent 70%)",
          }}
        />
        {/* Grain noise */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-500 ease-out group-hover:opacity-40"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundSize: "128px 128px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 px-6 py-8 text-center sm:px-8 sm:py-10">
          <h3 className={`text-xl text-foreground sm:text-2xl ${font}`}>
            {title}
          </h3>
          <p
            className="max-w-xs text-sm leading-relaxed text-foreground/50 sm:text-base"
            style={{ textWrap: "balance" }}
          >
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
