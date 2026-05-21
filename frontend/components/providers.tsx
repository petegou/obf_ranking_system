"use client";

import { ReleaseNotesAutoPopup } from "@/components/release-notes-auto-popup";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TooltipProvider>
        {children}
        <ReleaseNotesAutoPopup />
      </TooltipProvider>
    </AuthProvider>
  );
}
