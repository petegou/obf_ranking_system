"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ChevronsRight, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const DEFAULT_WIDTH = 700;
const MIN_WIDTH = 560;
const MAX_WIDTH = 960;
const APP_SIDEBAR_WIDTH = 240;
const MIN_RANKINGS_WIDTH = 480;

function clampPanelWidth(width: number) {
  const viewportMax =
    typeof window === "undefined"
      ? MAX_WIDTH
      : Math.max(
          MIN_WIDTH,
          window.innerWidth - APP_SIDEBAR_WIDTH - MIN_RANKINGS_WIDTH
        );
  return Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH, viewportMax);
}

export function FundDetailDock({
  selectedTickers,
  children,
}: {
  selectedTickers: string[];
  children: React.ReactNode;
}) {
  const selectionKey = useMemo(
    () => [...selectedTickers].sort().join(","),
    [selectedTickers]
  );
  const [minimizedSelectionKey, setMinimizedSelectionKey] = useState<
    string | null
  >(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const isMinimized = minimizedSelectionKey === selectionKey;

  useEffect(() => {
    function adaptPanelWidth() {
      if (window.innerWidth < 1280) return;
      const preferredWidth = window.innerWidth * 0.48;
      setWidth((current) =>
        current === DEFAULT_WIDTH
          ? clampPanelWidth(preferredWidth)
          : clampPanelWidth(current)
      );
    }

    adaptPanelWidth();
    window.addEventListener("resize", adaptPanelWidth);
    return () => window.removeEventListener("resize", adaptPanelWidth);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    function handlePointerMove(event: PointerEvent) {
      setWidth(clampPanelWidth(window.innerWidth - event.clientX));
    }

    function handlePointerUp() {
      setIsResizing(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isResizing]);

  if (selectedTickers.length === 0) return null;

  if (isMinimized) {
    return (
      <aside className="flex w-14 shrink-0 flex-col items-center border-l border-[var(--border-subtle)] bg-[var(--surface-card)] px-2 py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Open fund detail panel"
              onClick={() => setMinimizedSelectionKey(null)}
            >
              <PanelRightOpen className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Open fund details</TooltipContent>
        </Tooltip>
        <div className="mt-3 rounded-md border border-[var(--border-subtle)] px-1.5 py-2 text-center font-mono text-[10px] font-semibold text-[var(--text-secondary)]">
          {selectedTickers.length}
        </div>
      </aside>
    );
  }

  const panelStyle = {
    "--detail-panel-width": `${width}px`,
  } as CSSProperties;

  return (
    <>
      <button
        type="button"
        aria-label="Dismiss fund detail overlay"
        onClick={() => setMinimizedSelectionKey(selectionKey)}
        className="absolute inset-0 z-20 hidden bg-black/35 max-xl:block"
      />
      <aside
        className={cn(
          "relative z-30 flex min-h-0 w-[var(--detail-panel-width)] shrink-0 flex-col overflow-hidden border-l border-[var(--border-subtle)] bg-[var(--surface-card)]",
          "max-xl:absolute max-xl:inset-y-0 max-xl:right-0 max-xl:w-[min(92vw,760px)] max-xl:max-w-full max-xl:shadow-2xl"
        )}
        style={panelStyle}
      >
        <button
          type="button"
          aria-label="Resize fund detail panel"
          onPointerDown={(event) => {
            event.preventDefault();
            setIsResizing(true);
          }}
          className={cn(
            "absolute left-0 top-0 z-10 h-full w-2 -translate-x-1 cursor-col-resize touch-none max-xl:hidden",
            "after:absolute after:left-1/2 after:top-0 after:h-full after:w-px after:-translate-x-1/2 after:bg-transparent",
            "hover:after:bg-[var(--brand-primary)] focus-visible:outline-none focus-visible:after:bg-[var(--brand-primary)]",
            isResizing && "after:bg-[var(--brand-primary)]"
          )}
        />
        <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              Fund detail
            </div>
            <div className="font-mono text-[10px] text-[var(--text-tertiary)]">
              {selectedTickers.length} selected
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Minimize fund detail panel"
                onClick={() => setMinimizedSelectionKey(selectionKey)}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Minimize fund details</TooltipContent>
          </Tooltip>
        </div>
        {children}
      </aside>
    </>
  );
}
