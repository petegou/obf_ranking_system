"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronsRight, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const DEFAULT_WIDTH = 640;
const MIN_WIDTH = 420;
const MAX_WIDTH = 860;

function clampPanelWidth(width: number) {
  return Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH);
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

  return (
    <aside
      className="relative flex min-h-0 shrink-0 flex-col overflow-hidden border-l border-[var(--border-subtle)] bg-[var(--surface-card)]"
      style={{ width }}
    >
      <button
        type="button"
        aria-label="Resize fund detail panel"
        onPointerDown={(event) => {
          event.preventDefault();
          setIsResizing(true);
        }}
        className={cn(
          "absolute left-0 top-0 z-10 h-full w-2 -translate-x-1 cursor-col-resize touch-none",
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
  );
}
