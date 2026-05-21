/**
 * Release notes — append a new entry at the top of RELEASE_NOTES on every
 * user-visible release. The auto-popup compares each user's
 * last_seen_version (from the user_release_views table) against
 * LATEST_RELEASE.version on login.
 *
 * Versioning convention: ISO date strings (YYYY-MM-DD). Matches the app's
 * as_of_date convention and gives us cheap lexicographic ordering.
 */

export type ReleaseNote = {
  version: string;       // ISO date, e.g. "2026-05-20"
  title: string;
  highlights: string[];  // plain-text bullets
};

// Newest first. Prepend new entries here.
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "2026-05-20",
    title: "Updated Fund Rankings format",
    highlights: [
      "New official data file (Updated Fund Rankings.xlsx) is now the canonical upload.",
      "Asset Type and Last Price now show in the fund detail panel and the rankings grid.",
      "Scoring engine now receives beta, std dev, kurtosis, skewness, drawdown, and DD dev — metrics it had been silently treating as null.",
      "Fixed a pagination bug that left ~75% of categories without rankings on large snapshots.",
    ],
  },
];

export const LATEST_RELEASE: ReleaseNote = RELEASE_NOTES[0];

/**
 * Returns release notes strictly newer than `lastSeen` (lexicographic
 * comparison on ISO dates). Used by the auto-popup to surface the backlog
 * of unseen releases on each login.
 *
 * For brand-new users (`lastSeen === null`) we return an empty list — the
 * caller seeds their last_seen_version to LATEST_RELEASE.version on first
 * login so they don't get a wall of history.
 */
export function releasesNewerThan(lastSeen: string | null): ReleaseNote[] {
  if (!lastSeen) return [];
  return RELEASE_NOTES.filter((r) => r.version > lastSeen);
}
