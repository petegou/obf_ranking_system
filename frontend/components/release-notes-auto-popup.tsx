"use client"

import { useEffect, useRef, useState } from "react"

import { useAuth } from "@/lib/auth-context"
import { LATEST_RELEASE } from "@/lib/release-notes"

import { ReleaseNotesDialog } from "./release-notes-dialog"

/**
 * Auto-popup orchestration for release notes.
 *
 * On mount (and whenever the authenticated user identity changes), this:
 *   1. Asks /api/release-views for the user's stored last_seen_version.
 *   2. If the user has no row yet, POSTs to seed it at LATEST_RELEASE.version
 *      and shows nothing — first-login users don't get a history dump.
 *   3. If lastSeenVersion is older than LATEST_RELEASE.version, opens the
 *      dialog with the backlog of unseen entries.
 *   4. On dismiss, PATCHes the cursor forward to LATEST_RELEASE.version.
 *
 * Network failures are intentionally silent — a side feature should never
 * block the workbench from loading.
 */
export function ReleaseNotesAutoPopup() {
  const { user, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const [lastSeenVersion, setLastSeenVersion] = useState<string | null>(null)
  const lastCheckedUserId = useRef<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user) {
      // Sign-out tears down the workbench tree (auth-gated routes redirect
      // to /login), so this component unmounts naturally. No need to
      // toggle local state from the effect.
      lastCheckedUserId.current = null
      return
    }
    if (lastCheckedUserId.current === user.id) return
    lastCheckedUserId.current = user.id

    let cancelled = false

    async function check() {
      try {
        const res = await fetch("/api/release-views", { cache: "no-store" })
        if (!res.ok) return
        const body = (await res.json()) as { lastSeenVersion: string | null }
        if (cancelled) return

        if (body.lastSeenVersion === null) {
          // First-login: seed at the latest release; don't open the dialog.
          await fetch("/api/release-views", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lastSeenVersion: LATEST_RELEASE.version }),
          })
          if (cancelled) return
          setLastSeenVersion(LATEST_RELEASE.version)
          return
        }

        setLastSeenVersion(body.lastSeenVersion)
        if (LATEST_RELEASE.version > body.lastSeenVersion) {
          setOpen(true)
        }
      } catch {
        // Silent fail: never block the workbench.
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [user, loading])

  async function handleDismiss() {
    try {
      await fetch("/api/release-views", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastSeenVersion: LATEST_RELEASE.version }),
      })
    } catch {
      // Silent fail; the dialog still closes locally.
    }
    setLastSeenVersion(LATEST_RELEASE.version)
  }

  return (
    <ReleaseNotesDialog
      open={open}
      onOpenChange={setOpen}
      mode="unseen"
      lastSeenVersion={lastSeenVersion}
      onDismiss={handleDismiss}
    />
  )
}
