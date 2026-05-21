"use client"

import { Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

import { RELEASE_NOTES, releasesNewerThan, type ReleaseNote } from "@/lib/release-notes"

type Mode = "unseen" | "all"

export interface ReleaseNotesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: Mode
  lastSeenVersion: string | null
  onDismiss: () => void
}

function formatVersionLabel(version: string) {
  // ISO date → "May 20, 2026"
  const d = new Date(`${version}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return version
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })
}

export function ReleaseNotesDialog({
  open,
  onOpenChange,
  mode,
  lastSeenVersion,
  onDismiss,
}: ReleaseNotesDialogProps) {
  const entries: ReleaseNote[] =
    mode === "unseen" ? releasesNewerThan(lastSeenVersion) : RELEASE_NOTES

  if (entries.length === 0) return null

  const headerCopy =
    mode === "unseen"
      ? entries.length === 1
        ? "Here's what changed since you were last here."
        : `${entries.length} updates since you were last here.`
      : "Every release the workbench has shipped, newest first."

  const primaryLabel = mode === "unseen" ? "Got it" : "Close"

  function handleDismiss() {
    onDismiss()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span className="text-[10px] font-medium uppercase tracking-wider">
              {mode === "unseen" ? "What's new" : "Release notes"}
            </span>
          </div>
          <DialogTitle>
            {mode === "unseen" ? entries[0].title : "Release notes"}
          </DialogTitle>
          <DialogDescription>{headerCopy}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-5">
            {entries.map((entry, index) => {
              const isSeen =
                mode === "all" &&
                lastSeenVersion !== null &&
                entry.version <= lastSeenVersion

              return (
                <div key={entry.version}>
                  {index > 0 ? (
                    <Separator className="mb-5 bg-[var(--border-subtle)]" />
                  ) : null}
                  <article>
                    <header className="mb-2 flex items-baseline justify-between gap-3">
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                          {entry.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className="border-[var(--border-subtle)] text-[10px] font-medium tracking-wide text-[var(--text-tertiary)]"
                        >
                          {formatVersionLabel(entry.version)}
                        </Badge>
                      </div>
                      {isSeen ? (
                        <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] opacity-60">
                          Seen
                        </span>
                      ) : null}
                    </header>
                    <ul className="space-y-1.5 border-l border-[var(--border-subtle)] pl-3 text-sm text-[var(--text-secondary)]">
                      {entry.highlights.map((line, lineIdx) => (
                        <li key={lineIdx} className="leading-relaxed">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </article>
                </div>
              )
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={handleDismiss}>{primaryLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
