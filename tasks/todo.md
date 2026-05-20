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
