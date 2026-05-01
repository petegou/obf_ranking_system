"use client";

import { useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "auto";

const STORAGE_KEY = "obf-theme";
const CHANGE_EVENT = "obf-theme-change";
let memoryMode: ThemeMode = "auto";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "auto";
}

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  let value: string | null = null;
  try {
    value = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryMode;
  }
  memoryMode = isThemeMode(value) ? value : "auto";
  return memoryMode;
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function getResolvedTheme(mode = getStoredMode()): "light" | "dark" {
  return mode === "auto" ? (systemPrefersDark() ? "dark" : "light") : mode;
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const resolved = getResolvedTheme(mode);
  document.documentElement.dataset.theme = mode;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function setThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  memoryMode = mode;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Keep the current session themed even if persistence is unavailable.
  }
  applyThemeMode(mode);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const notify = () => {
    applyThemeMode(getStoredMode());
    onStoreChange();
  };
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  mediaQuery.addEventListener("change", notify);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    mediaQuery.removeEventListener("change", notify);
  };
}

function getSnapshot() {
  return `${getStoredMode()}:${getResolvedTheme()}`;
}

function getServerSnapshot() {
  return "auto:light";
}

export function useThemeMode() {
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const mode = getStoredMode();
  return {
    mode,
    resolvedTheme: getResolvedTheme(mode),
    setMode: setThemeMode,
  };
}
