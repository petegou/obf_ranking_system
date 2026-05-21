"use client"

import { Sparkles } from "lucide-react"

/**
 * Button row for the sidebar account menu's "Release notes" entry.
 *
 * Important: this component is ONLY the trigger button. The dialog itself
 * is rendered by the parent (AccountMenu) and lives outside the menu's
 * conditional render block — otherwise closing the menu unmounts the
 * dialog before it can open. State for the dialog therefore lives in the
 * parent so it survives the menu's collapse.
 */
export function ReleaseNotesMenuItem({
  onSelect,
}: {
  /** Fired when the row is clicked. The parent should close the menu and open the dialog. */
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
    >
      <Sparkles className="h-4 w-4" aria-hidden="true" />
      <span>Release notes</span>
    </button>
  )
}
