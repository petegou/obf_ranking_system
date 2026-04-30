"use client";

import { motion } from "motion/react";

export function PanelMotion({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="flex-1 min-h-0 flex flex-col"
    >
      {children}
    </motion.div>
  );
}
