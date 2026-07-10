# Scatter Analytics Experience — Todo

## Active — Make fund comparison informational and responsive

- [x] Make the fund detail dock adapt to available viewport width without crushing the rankings grid.
- [x] Rework the risk/return chart hierarchy, selected-fund key, tooltips, and category context.
- [x] Keep selected funds pinned above the full peer table and preserve unlimited selection.
- [x] Correct misleading analytics labels and improve single-fund/multi-fund navigation.
- [x] Verify typecheck, lint, build, and authenticated browser behavior at wide and narrow desktop widths.

## Verification

- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm run build` passed with the existing multiple-lockfile workspace-root warning.
- Authenticated browser checks passed on a fresh `localhost:3001` server:
  - 1440px split layout retained 509px for rankings and gave 691px to the detail panel.
  - 1000px layout used the dimmed overlay and kept the comparison readable.
  - 3Y/5Y switching updated chart labels, peer-table columns, and rank context together.
  - Tooltip uses a compact fund header, period badge, and aligned annualized risk, return, and GOV metrics without duplication.
  - Six selected funds rendered with horizontally scrollable tabs and a compact `+2 more` chart key.

# Snapshot Date Selector — Todo

## Planned — Let users switch between uploaded ranking snapshots

- [x] Add shared snapshot date helpers and date-aware query helpers.
- [x] Add API support for snapshot lists, date-aware sidebar categories, and date-aware fund search.
- [x] Add top-bar snapshot selector with default `Latest (resolved date)` plus explicit `date=YYYY-MM-DD` options.
- [x] Make the persistent sidebar refetch category counts/hierarchy for the selected date.
- [x] Pass the selected date through overview, category pages, fund detail panel, and full fund pages.
- [x] Preserve `date` during sidebar navigation, breadcrumbs, fund search, and grid fund selection.
- [x] Add empty states for snapshot/category/fund combinations with no rows.
- [x] Verify typecheck, lint, and build.
- [ ] Authenticated browser smoke.

## Verification

- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm run build` passed with the existing multiple-lockfile workspace-root warning.
- Browser smoke is `gated-on-user-action`: local routes are auth-gated and no authenticated browser session/credentials were available in this run.

> Plan: `docs/superpowers/plans/2026-07-01-snapshot-date-selector.md`

# Sidebar Category Hierarchy (L1–L4) — Todo

## Active — Group fund categories in sidebar by Excel-defined L1–L4 paths

- [x] Migration 006 — `category_hierarchy` dimension table (59 rows from `~/Desktop/Book1.xlsx`) + `category_counts` view rewritten to LEFT JOIN it with `WITH (security_invoker = true)`.
- [x] Applied migration 006 to production Supabase (additive + idempotent, no branch needed).
- [x] `getCategoriesWithCounts` returns `level_1..level_4` alongside `category`/`count`.
- [x] `CategoryNavItem` extended with the four nullable level fields.
- [x] `Sidebar` builds a nested tree, renders collapsible internal nodes (chevron + aggregated count), keeps leaves on `/categories/<Assigned Category>`, single-leaf groups collapse to their leaf, persists expand/collapse via `useSyncExternalStore` against `localStorage` key `obf.sidebar.expanded.v1`, and auto-expands the path to the active leaf.

## Verification

- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm run build` passed (existing multi-lockfile workspace-root warning unchanged).
- DB checks via Supabase MCP:
  - `category_hierarchy` table created with 59 seed rows.
  - `category_counts` view returns L1–L4 alongside `category`/`fund_count`; spot-checked FI Muni Bonds tree, US Equities, Alternatives.
  - `get_advisors` (security): no new ERROR; new view has `security_invoker = true`; remaining WARNs are all pre-existing tech debt.
  - Found 2 DB categories absent from the Excel hierarchy: `Europe Large Cap`, `US Multi-Cap Core` — both will render under the "Uncategorized" L1 bucket as designed.

### Browser smoke — `gated-on-user-action`

The local dev server on `:3000` is running but auth-gated, so the following must be confirmed after sign-in:

- [ ] Sidebar shows nested L1 groups with chevrons; counts on group rows equal the sum of descendant leaves.
- [ ] Clicking a group expands/collapses; clicking a leaf navigates to `/categories/<Assigned Category>` with active styling unchanged.
- [ ] Refresh preserves expand/collapse state.
- [ ] Navigating directly to a leaf auto-expands the path to it.
- [ ] FI Muni Bonds full tree (Fixed Income → Muni Bonds → National → High Yield/Long/Short/Municipal; → Single State → Long/Short/Municipal) matches the Excel.
- [ ] `Europe Large Cap` and `US Multi-Cap Core` appear under an "Uncategorized" L1 group at the bottom.

If the sidebar still renders flat after these changes, restart the Next dev server — Turbopack can hold stale server chunks (see `tasks/lessons.md`).

# Updated Fund Rankings CSV — Todo

## Active — Switch importer + schema to the new official CSV format

- [x] Inspect live Supabase schema (`tasks/2026-05-20-schema-inspection.md`).
- [x] Migration 004 — add `funds.asset_type` and 16 missing columns to `fund_metrics`.
- [x] Apply migration 004 to production Supabase (user opted to skip branch path; migration is additive only).
- [x] Rewrite `frontend/lib/csv-import.ts` for the new "Updated Fund Rankings" headers:
  - new column map (53 fields)
  - `parseInceptionDate` (`Mon-DD-YYYY` → ISO, calendar-day validated)
  - `warnings[]` on `ImportResult`; uncategorized rows are warnings, not errors
  - funds-registry upsert omits `name`, preserving existing names on conflict
- [x] Surface `warnings` on `/api/upload` response totals.
- [x] Extend `getFundDetail` to return `asset_type`.
- [x] Render `Asset Type` chip in fund detail header.
- [x] Add `Last Price` column to rankings grid (new `formatPriceMetric` for 2-decimal currency).

## Verification

- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm run build` passed (existing multiple-lockfile workspace-root warning).
- Supabase column inventory confirmed all 17 new columns present in production.
- Manual CSV upload against production + score-shift spot-checks pending — to be triggered via the admin upload UI when ready.

## Known trade-offs

- New tickers seen for the first time will land with `funds.name = ''` (existing names preserved on conflict, per spec). UI degrades gracefully but admins should backfill names. Worth a follow-up if the trade-off proves disruptive.
- Pre-existing Supabase advisor warnings (GraphQL anon/authenticated exposure on every public table, `is_admin()` SECURITY DEFINER, leaked-password protection off) are unchanged by this work but are real tech debt.

## Open follow-ups from the first production upload (2026-05-20)

After the first upload of `Updated Fund Rankings.csv` to production, the scatter chart on `/categories/Alternatives` revealed three data-quality issues from the upstream CSV. Spot-check vs. the prior YCharts upload (2026-04-28) using JEPI as a reference:

| Field | Old (decimal) | New (CSV %) | Expected % | Status |
|---|---|---|---|---|
| `return_3yr` | 0.313741 | 29.99 | 30% | OK (UI auto-detects) |
| `drawdown_3yr` | 0.132557 | 13.26 | 13.26% | OK |
| `std_dev_3yr` | 0.00634 | 0.01 | daily decimal, ann. 10% | Precision loss (see below) |
| `alpha_3yr` | -2.601374 | -342.93 | ~-3.4% | ~100× too large (pending verification) |
| `tracking_error_3yr` | 5.42 | 542 | ~5.4% | ~100× too large (pending verification) |

### Issues

1. **Alpha + Tracking Error scale (pending verification).** ~80% of funds (5,348 of 6,724) have `|alpha_3yr| > 50` and ~89% have `|tracking_error_3yr| > 50`. Both look like they're encoded as basis-points but emitted with a `%` suffix (e.g. `-342.93%` should be -3.43%). Waiting on the source Excel sheet to confirm before scaling in the importer.
2. **2,018 funds (30%) have `std_dev_3yr = 0`** — upstream writes `0` (or empty) where the metric is unavailable. Leaving as-is per decision; these plot at x=0 on the scatter. Revisit if it becomes UX-disruptive.
3. **Std Dev precision lost from upstream.** New CSV provides `std_dev_3yr` rounded to 2 decimals (e.g. JEPI = 0.01), where the old YCharts feed gave 5+ decimals (0.00634). Many funds annualize to identical values (0.01 → 15.87%) which weakens within-category ranking on that metric. Flag to data provider as a follow-up; no code change.

### Action items

- [ ] Receive original Excel sheet from data provider; confirm intended units for Alpha and Tracking Error.
- [ ] If basis-points: update `frontend/lib/csv-import.ts` to scale alpha + TE by 1/100 on import, then re-upload 5/20 CSV (or run a one-shot `UPDATE fund_metrics SET alpha_3yr = alpha_3yr / 100 ...`).
- [ ] Flag std_dev precision regression to data provider; request 4-5 decimals.

> Spec: `docs/superpowers/specs/2026-05-19-updated-fund-rankings-csv-design.md`
> Plan: `docs/superpowers/plans/2026-05-19-updated-fund-rankings-csv.md`

# Frontend Workbench UX — Todo

## Active — Fund Detail Panel
- [x] Hide the fund detail panel until a fund is selected.
- [x] Add detail panel minimize/reopen behavior for selected funds.
- [x] Add resizable detail panel width control.
- [x] Remove the temporary fund comparison chart from the detail panel.
- [x] Move full fund page overview content into the individual fund overview tab.
- [x] Normalize percentage-style raw metric display units across grid and scatter chart.
- [x] Convert risk/reward scatter to annualized risk and annualized return.
- [x] Add a Morningstar-style risk/reward breakdown table with GOV.
- [x] Run frontend verification.

## Verification
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm run build` passed with the existing multiple-lockfile workspace-root warning.
- Dev server not started because an existing app server is already running.

# Backend Data Validation — Todo

## Active — API and Import Validation
- [x] Add reusable backend validators for scoring config and upload metadata.
- [x] Tighten CSV import row validation for required identity fields and numeric parsing.
- [x] Wire validation into API routes before database writes or ranking recalculation.
- [x] Run frontend verification.

## Verification
- `npx tsc --noEmit` passed.
- `npx eslint app/api/config/route.ts app/api/upload/route.ts lib/api-validation.ts lib/csv-import.ts` passed.
- `npm run build` passed with the existing multiple-lockfile workspace-root warning.
- Full `npm run lint` passed after the fund detail dock minimized-state fix.

# Phase 1 Dashboard Redesign — Todo

## Active — Overview Decision Dashboard
- [x] Add overview summary helpers for score bands, category opportunity, and review candidates.
- [x] Replace the overview scatter/list layout with decision dashboard panels.
- [x] Verify lint, typecheck, build, and browser smoke checks.

Verification:
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm run build` passed with the existing multiple-lockfile workspace-root warning.
- Browser checked authenticated overview at `localhost:3001` in light and dark themes.
- Verified overview fund link routing to `/categories/US%20Large%20Cap%20Growth?fund=SPYG`.
- Fixed overview row fetching to page through Supabase's 1,000-row response cap; browser confirmed 6,551 funds and 65 categories on 04/28/2026.

## Completed — Category Grid Full Dataset Columns
- [x] Expand category rankings with available score breakdown and raw metric fields.
- [x] Add a community-compatible column chooser with explicit Save behavior.
- [x] Re-run lint, typecheck, and build verification.
- [x] Restore row click fund selection after the AG Grid row selection API change.
- [x] Update efficiency curve to plot 3Y/5Y standard deviation against matching returns.
- [x] Add multi-fund detail tabs for All comparison and individual fund detail views.
- [x] Add sidebar account menu with theme selector, admin links, and logout.
- [x] Complete app-wide Light/Dark/Auto theme integration across shell, shadcn tokens, AG Grid, and AG Charts.
- [x] Add durable user column presets for the category table.
  - [x] Add Supabase migration with private per-user RLS.
  - [x] Add authenticated preset API routes.
  - [x] Refactor category table columns to stable preset IDs.
  - [x] Extend the current column popup with preset management.
  - [x] Run typecheck, lint, and build verification.

> Detailed plan: `docs/superpowers/plans/2026-04-29-dashboard-ui-redesign.md`
> Spec: `docs/superpowers/specs/2026-04-29-dashboard-ui-design.md`
> Each item below is one task in the plan; check off as completed.

## Setup
- [x] Task 1 — Install shadcn/ui + motion
- [x] Task 2 — Add Inter + JetBrains Mono fonts and color tokens
- [x] Task 3 — Centralize `scoreColor()` into `lib/score-color.ts`

## Layout shell
- [x] Task 4 — Create `(auth)` route group for login/setup
- [x] Task 5 — Build `<AppShell>` skeleton + `(workbench)/layout.tsx`
- [x] Task 6 — Build full `<Sidebar>` with categories, analysis, admin sections
- [x] Task 7 — Build `<TopBar>` with breadcrumb + search slot
- [x] Task 8 — Migrate existing pages into `(workbench)`; rename rankings→categories, fund→funds
- [x] Task 9 — Wire up `<FundSearch>` typeahead + `/api/funds/search`

## Data helpers
- [x] Task 10 — Add `getOverviewKpis()`
- [x] Task 11 — Add `getAllFundsForScatter()`
- [x] Task 12 — Add `getFundPeerStats()`

## Overview page
- [x] Task 13 — Build `<KpiStrip>`
- [x] Task 14 — Build `<RiskReturnScatter>`
- [x] Task 15 — Build `<HighestPerCategory>`

## Category workbench
- [x] Task 16 — Promote `<ScoreBar>` to shared component
- [x] Task 17 — Build `<RankingsGrid>` (AG Grid + URL selection)
- [x] Task 18 — Build `<FundDetailPanel>` + tab subcomponents
- [x] Task 19 — Compose category workbench page

## Fund detail refresh + redirect
- [x] Task 20 — Restyle `/funds/[ticker]` with new tokens
- [x] Task 21 — Add `/rankings`→`/categories` and `/fund`→`/funds` redirects

## Phase 2 placeholders
- [x] Task 22 — Build `<ComingSoonPanel>` and placeholder routes for compare/scatter/distribution

## Loading + errors
- [x] Task 23 — Add `loading.tsx` and `error.tsx` for workbench routes

## Final verification
- [x] Task 24 — Walk through spec verification checklist + typecheck + lint

## Review (fill in after execution)

Implemented Phase 1 dashboard redesign on `codex-dashboard-ui-redesign`.

Summary:
- Added shadcn/Radix primitives, Motion, Inter, JetBrains Mono, project tokens, and shared score coloring.
- Built the authenticated workbench shell with sidebar, top bar, fund search, overview dashboard, category workbench, full fund detail refresh, legacy redirects, Phase 2 placeholders, and loading/error states.
- Added overview, scatter, highest-scoring, peer-stats, and fund-search data helpers.

Verification:
- `npx tsc --noEmit` passed.
- `npm run lint` passed with zero warnings.
- `npm run build` passed.
- Browser smoke checked `/login`, `/compare`, and legacy `/rankings/Commodities` redirecting to `/categories/Commodities` on the existing dev server at `localhost:3001`.
- Copy scan found no app UI usage of "best fund", "winner", "top pick", "best", or "top-ranked".

Deviations and notes:
- Current shadcn CLI no longer offers the old New York prompt; used the closest current Radix/Lucide/Inter preset and then applied project tokens explicitly.
- Preserved `/auth/setup` by moving setup to `app/(auth)/auth/setup/page.tsx`; the plan path would have changed the URL to `/setup`.
- Used a client `TopBar` with `usePathname()` instead of internal request headers.
- Adjusted AG Charts config for v13 object-style axes and `seriesNodeClick` listener.
- Full regular-vs-admin browser verification still needs real account coverage; no credentials were provided in this run.
