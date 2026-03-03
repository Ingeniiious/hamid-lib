"use client";

import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export function MajorDivider({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease }}
      className="flex items-center gap-4 py-2"
    >
      <Separator className="flex-1" />
      <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
        {name}
      </span>
      <Separator className="flex-1" />
    </motion.div>
  );
}
