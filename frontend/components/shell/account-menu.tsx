"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import {
  Check,
  Database,
  LogOut,
  Monitor,
  Moon,
  Settings2,
  Sun,
  User,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { ReleaseNotesMenuItem } from "@/components/release-notes-menu-item";
import { useThemeMode, type ThemeMode } from "@/lib/theme";

const THEME_OPTIONS: {
  value: ThemeMode;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "auto", label: "Auto", icon: Monitor },
];

export function AccountMenu({
  user,
  isAdmin,
  onSignOut,
}: {
  user: SupabaseUser;
  isAdmin: boolean;
  onSignOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { mode, setMode } = useThemeMode();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {open ? (
        <div className="absolute bottom-12 left-0 z-50 w-[300px] overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-2 shadow-2xl">
          <div className="px-3 py-2 text-xs text-[var(--text-tertiary)]">
            <div className="truncate">{user.email}</div>
          </div>

          <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-[var(--text-quaternary)]">
            Theme
          </div>
          <div className="space-y-1">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = mode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  className={`flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                    selected
                      ? "bg-[var(--brand-primary-tint)] text-[var(--brand-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="flex-1 text-left">{option.label}</span>
                  {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>

          <div className="my-2 h-px bg-[var(--border-subtle)]" />
          <ReleaseNotesMenuItem onSelect={() => setOpen(false)} />

          {isAdmin ? (
            <>
              <div className="my-2 h-px bg-[var(--border-subtle)]" />
              <Link
                href="/upload"
                onClick={() => setOpen(false)}
                className="flex h-9 items-center gap-3 rounded-md px-3 text-sm text-[var(--text-secondary)] no-underline transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
              >
                <Database className="h-4 w-4" aria-hidden="true" />
                <span>Upload files</span>
              </Link>
              <Link
                href="/formulas"
                onClick={() => setOpen(false)}
                className="flex h-9 items-center gap-3 rounded-md px-3 text-sm text-[var(--text-secondary)] no-underline transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
              >
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                <span>Admin settings</span>
              </Link>
            </>
          ) : null}

          <div className="my-2 h-px bg-[var(--border-subtle)]" />
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <User className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-xs">{user.email}</span>
      </button>
    </div>
  );
}
