"use client"

import { Sparkles } from "lucide-react"
import { useState } from "react"

import { ReleaseNotesDialog } from "./release-notes-dialog"

/**
 * The "Release notes" entry in the sidebar account menu.
 *
 * Voluntary opens render the dialog in `mode="all"`: every release is
 * visible, newest first, and dismissing does NOT advance the user's
 * last_seen_version cursor (we only advance on the auto-popup path).
 * We pass `lastSeenVersion={null}` so the dialog skips the "Seen" pill
 * — when the user is browsing voluntarily the distinction is noise, not
 * signal.
 */
export function ReleaseNotesMenuItem({
  onSelect,
}: {
  /** Called when the user clicks the menu row, so the parent menu can close. */
  onSelect?: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onSelect?.()
          setOpen(true)
        }}
        className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <span>Release notes</span>
      </button>

      <ReleaseNotesDialog
        open={open}
        onOpenChange={setOpen}
        mode="all"
        lastSeenVersion={null}
        onDismiss={() => {
          // No side effect — voluntary opens do not advance the cursor.
        }}
      />
    </>
  )
}
