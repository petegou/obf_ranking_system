"use client";

import { motion } from "motion/react";

export function PanelMotion({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}
