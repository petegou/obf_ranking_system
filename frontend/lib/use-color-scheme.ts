"use client";

import { useThemeMode } from "./theme";

export function useIsDarkMode(): boolean {
  return useThemeMode().resolvedTheme === "dark";
}
