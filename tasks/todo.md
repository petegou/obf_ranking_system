# Phase 1 Dashboard Redesign — Todo

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
- [ ] Task 22 — Build `<ComingSoonPanel>` and placeholder routes for compare/scatter/distribution

## Loading + errors
- [ ] Task 23 — Add `loading.tsx` and `error.tsx` for workbench routes

## Final verification
- [ ] Task 24 — Walk through spec verification checklist + typecheck + lint

## Review (fill in after execution)

_Append a short summary of what was done, deviations from the plan, and any follow-ups._
