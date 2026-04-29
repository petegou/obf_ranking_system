# Dashboard UI Redesign — Design Spec

**Date:** 2026-04-29
**Status:** Approved — ready for implementation planning
**Scope:** Phase 1 of a multi-phase UI evolution

---

## Goal

Evolve the Oak Bridge Fund Ranking System from a generic three-page browse flow (categories → rankings → fund detail) into an analyst workbench that consolidates the analytical work the team currently does in external tools. The goal is to make the ranking system the analysts' single, end-to-end environment for fund evaluation.

This spec defines Phase 1: the foundational layout, two fully-built views, and shells for future analytical features. It is intentionally not a full feature build — it establishes the architecture and visual language that Phase 2+ features (comparison, scatter explorer, distribution) will plug into.

---

## Users & Workflow

**Primary users:** internal Oak Bridge investment team. They consume rankings (rather than tweaking the algorithm) and currently leave the app to do deeper analysis in external tools.

**External analyses they do today (Phase 2 targets):**
- Risk/return scatter plots (efficiency frontier views)
- Side-by-side fund comparison (2–4 funds across all metrics)
- Category-level score distribution (histograms / box plots)
- Time-series tracking (score changes over time)
- Peer benchmarking (fund vs category average per metric)

**Phase 1 directly serves:** the day-to-day "open the app, scan rankings, drill into a category, inspect a fund" workflow — but with substantially more analytical context surfaced inline (KPIs, scatter preview, peer-comparison stats in the right panel).

---

## Decision-Support Framing (Hard Constraint)

Per `.claude/CLAUDE.md`, rankings are framed as **decision-support tools, not absolute selections**. UI copy and visual design must reinforce this:

- No "best fund," "winner," "top pick," or verdict-style language anywhere in the UI.
- Score numbers always presented with their range and category context (e.g. "82.1 of 100" or "82.1, category avg 61.4").
- The Overview's "#1 fund per category" list is labeled "Highest-scoring per category" — descriptive, not prescriptive.
- The footer disclaimer remains.

---

## Layout Shell

A persistent layout — `<AppShell>` — wraps every authenticated page. Three regions:

### Sidebar (left, ~240px, collapsible to ~64px)
- Brand mark: "Oak Bridge" wordmark + small gold accent stroke (the only place gold is used) + "Fund Rankings" eyebrow.
- Section: **Workspace** — Overview link.
- Section: **Categories** — list of all categories with fund counts (e.g. `Large Blend  47`). Active category highlighted with a navy background tint and a 2px navy left border.
- Section: **Analysis** — Compare, Scatter, Distribution. These are visible but show a "Coming soon" state in Phase 1.
- Section (admin only): **Admin** — Formulas, Upload.
- Footer: signed-in user email + sign-out.

### Top bar (~44px, white, hairline border below)
- Breadcrumb: e.g. `Categories / Large Blend / VFIAX`. Active leaf bold, separators muted.
- Spacer.
- Last upload timestamp (small, muted).
- Fund search input (typeahead by ticker, jumps to fund detail).

### Main area
- Renders the current route's content. Page-level scroll lives here, not on the sidebar.

The shell is implemented as a Next.js 16 nested layout at `app/(workbench)/layout.tsx` so navigation between routes does not re-render the sidebar/topbar. Login and auth callback routes stay outside this group so they remain full-screen.

---

## Routes

| Route | Purpose | Phase |
|---|---|---|
| `/` | Overview dashboard (cross-category) | 1 |
| `/categories/[category]` | Category workbench (table + detail panel) | 1 |
| `/categories/[category]?fund=TICKER` | Same view, right panel populated for that fund | 1 |
| `/funds/[ticker]` | Full-page fund detail (existing, lightly refreshed) | 1 |
| `/compare` | Multi-fund comparison | 2 (placeholder shell) |
| `/scatter` | Efficiency frontier explorer | 2 (placeholder shell) |
| `/distribution` | Score distribution charts | 2 (placeholder shell) |
| `/formulas`, `/upload` | Admin (unchanged in Phase 1) | — |
| `/login`, `/auth/setup`, `/auth/callback` | Auth flows (unchanged) | — |

`/rankings/[category]` is renamed to `/categories/[category]`. A redirect from the old path to the new path preserves existing bookmarks.

**Selection lives in the URL.** The category workbench reads `searchParams.fund` server-side. Clicking a row in the grid does `router.replace(/categories/[cat]?fund=TICKER, { scroll: false })`. Every view is therefore shareable as a URL.

---

## Component Breakdown

Components are grouped by purpose. Each unit has one job and a clear interface. Server components by default; client components only where interaction requires it.

### Shell — `components/shell/`
- `<AppShell>` — server. Layout wrapper accepting `children`. Fetches the category list once via `getCategoriesWithCounts()` and passes it as a prop to `<Sidebar>`. Renders `<Sidebar>`, `<TopBar>`, and the main slot.
- `<Sidebar>` — client (uses `usePathname()` for active-route highlighting). Receives the category list as a prop so no data fetching happens client-side.
- `<TopBar>` — server shell. Contains client islands for `<FundSearch>` and `<UserMenu>`.
- `<FundSearch>` — client. Typeahead `<Input>` (shadcn) hitting `/api/funds/search?q=...`; selecting a result routes to `/funds/[ticker]`.

### Overview dashboard — `components/overview/` (rendered at `/`)
- `<KpiStrip>` — server. Four `<Card>`s: Total Funds, Categories, Avg GPA Score, % of funds scoring ≥70.
- `<RiskReturnScatter>` — client (AG Charts). Plots all funds on Risk Score (x) vs Return Score (y), color-coded by category. Hover tooltip; click jumps to that fund's category-workbench URL with `?fund=` set.
- `<HighestPerCategory>` — server. List of "Highest-scoring per category" rows, each linking to that category's workbench. Score bar uses the semantic color scale.

### Category workbench — `components/workbench/` (rendered at `/categories/[category]`)
- `<RankingsGrid>` — client (AG Grid). Sortable, filterable, column-toggle for score breakdown columns. Row click sets `?fund=TICKER` in the URL.
- `<FundDetailPanel>` — server. Re-renders when `fund` URL param changes. shadcn `<Tabs>`:
  1. **Overview** — score bars (shared `<ScoreBar>` from existing fund detail page), key stats, "View full detail →" link.
  2. **vs Peers** — AG Chart (grouped horizontal bar) showing this fund's metrics against category averages, one row per metric.
  3. **Market Data** — placeholder card noting "Market API integration pending." Slot reserved for Phase 2.
- `<EmptyDetail>` — shown when no fund is selected. Brief instruction: "Select a fund to inspect."

### Placeholders — `components/placeholders/`
- `<ComingSoonPanel>` — shared. Renders the section name, a one-paragraph description of what's planned, and a sample-mockup image or icon. Used by `/compare`, `/scatter`, `/distribution`.

### Shared / promoted from existing code
- `<ScoreBar>` — promote from the current fund detail page to `components/score-bar.tsx` so the right panel and the full fund page share it. Update its color logic to use the new semantic palette.
- `<Skeleton>` (shadcn) — used in `loading.tsx` for each route.

### shadcn primitives installed (Phase 1)
`Button`, `Card`, `Tabs`, `Badge`, `ScrollArea`, `Tooltip`, `Skeleton`, `Input`, `Separator`. Initialized to read from existing CSS variable tokens so theme integration requires no rewrite.

---

## Data Flow & State

- **Fetching is server-first.** Continue the pattern in `lib/queries.ts`. New helpers added with explicit TypeScript return types:
  - `getOverviewKpis(): Promise<OverviewKpis>` — total funds, category count, avg GPA, % ≥70. One query, leverages the existing `category_counts` view where possible.
  - `getAllFundsForScatter(): Promise<FundScatterRow[]>` — minimal projection of all ranked funds (~400 rows): ticker, name, category, risk_score, return_score, total_gpa_score, market_cap_score. Small enough to ship to the client without pagination.
  - `getFundPeerStats(ticker: string): Promise<FundPeerStats>` — fund metrics alongside category averages for the "vs Peers" tab.
- **Selection state** lives in the URL (`?fund=TICKER`). No global client state library required.
- **One client island per page max.** AG Grid on the workbench, AG Charts on the overview/peer tabs. Sidebar, topbar, and detail panel are server-rendered and refresh via Next.js RSC streaming as the URL changes.
- **Caching:**
  - `export const dynamic = "force-dynamic"` on rankings-bearing pages (`/`, `/categories/[category]`, `/funds/[ticker]`) — admins re-running formulas should see fresh data immediately.
  - Category list and KPI counts: `revalidate = 60` (changes rarely).
- **Loading & errors:** every route gets `loading.tsx` (shadcn `<Skeleton>`-based) and `error.tsx` (boundary with retry). Data helpers throw on Supabase failure rather than returning empty arrays — empty data and Supabase failure are different states and the user must see them differently.
- **Auth:** unchanged. The `(workbench)` layout asserts auth via the existing pattern. Admin-only nav items render conditionally on the existing `isAdmin` flag.

### TypeScript discipline
Per `.claude/CLAUDE.md`:
- All new query helpers and component props have explicit types. No `any` without an inline justification comment.
- Score values typed as `number` with documented ranges in JSDoc on the type definition.
- API response shapes typed at the data-helper boundary; route handlers return typed JSON.

---

## Visual Design

### Direction
"Modern Mono with restrained color." Linear-inspired chrome (precise, monochrome, hairline borders, tight spacing) layered with a small, deliberate color system that carries financial semantics.

### Typography
- **UI text:** `Inter`, weights 400 / 500 / 600 / 700.
- **All numerical values** (scores, ranks, tickers, counts, percentages): `JetBrains Mono`, with `font-variant-numeric: tabular-nums` for alignment.
- Replace existing `Geist`/`Geist_Mono` font setup in `app/layout.tsx`.

### Color tokens (extend `app/globals.css`)
Existing variables (`--accent`, `--card-bg`, etc.) remain so legacy components keep rendering. New tokens added:

```css
/* Chrome (monochrome scale) */
--surface-base: #fafafa;       /* page background */
--surface-card: #ffffff;       /* card / panel background */
--surface-muted: #f5f5f5;      /* hover, subtle fills */
--border-subtle: #ececec;
--border-default: #e5e5e5;
--text-primary: #0a0a0a;
--text-secondary: #525252;
--text-tertiary: #737373;
--text-quaternary: #a3a3a3;

/* Brand accent (used sparingly: active nav, primary buttons, focus rings) */
--brand-primary: #0d1f33;       /* navy */
--brand-primary-tint: rgba(13, 31, 51, 0.04);  /* selected row, hover tint */
--brand-gold: #c9a84c;          /* one moment only: brand-mark accent stroke */

/* Semantic data scale (for score values only, never on chrome) */
--score-strong: #15803d;
--score-moderate: #a16207;
--score-weak: #b91c1c;
```

Dark mode tokens follow the same structure with inverted values; defined in the existing `prefers-color-scheme: dark` block.

### Score color thresholds
The current code has four bands; we keep four bands but consolidate to three colors:

- ≥ 70 → `--score-strong`
- 50–69 → `--score-moderate`
- 30–49 → `--score-moderate` (same color)
- < 30 → `--score-weak`

The existing `scoreColor()` helper duplicated in `app/rankings/[category]/page.tsx` and `app/fund/[ticker]/page.tsx` is centralized into `lib/score-color.ts` and updated to return the new tokens.

### Density
- Table rows: 32px height (analyst-dense, comfortable to scan).
- Sidebar items: 28px height.
- Card padding: 16–20px.
- Section spacing: 24–32px between major regions.

### Borders & elevation
- Hairline borders (1px, `--border-subtle`) instead of shadows for separation.
- Cards do not float — they're delineated by border alone.
- One subtle shadow exception: the hover state on actionable cards (e.g., overview's category list rows) gets a 1px elevation effect via border darkening, not a drop shadow.

### Motion (using Motion / formerly Framer Motion)
Restrained — animation supports comprehension, not decoration:
- Right panel content fades + 4px slide-up when the selected fund changes (~150ms).
- Tab content cross-fades on switch (~100ms).
- KPI numbers count up on initial load (~300ms, ease-out).
- AG Charts have their own built-in transitions; we don't override them.
- Sidebar expand/collapse: 200ms ease-out transform.
- No scroll-driven, parallax, or attention-getting animations.

---

## Dependencies

**Approved additions:**
- `shadcn/ui` (CLI scaffold, components copied into `components/ui/`)
- Resulting transitive deps: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, and the `@radix-ui/*` packages backing the primitives we install.
- `motion` (animation library)

**No other new dependencies in Phase 1.** AG Grid and AG Charts are already installed.

---

## Phase 1 Build Sequence

This becomes the basis for `tasks/todo.md` once the implementation plan is written. High-level order:

1. **Setup**
   - Install shadcn/ui via CLI; configure to use existing CSS variables.
   - Install `motion`.
   - Add new color tokens and font imports to `app/globals.css` and `app/layout.tsx`.
   - Create `lib/score-color.ts` and update existing usages.

2. **Shell**
   - Build `<AppShell>`, `<Sidebar>`, `<TopBar>`, `<FundSearch>`.
   - Move existing pages under the `(workbench)` route group so they inherit the shell.
   - Verify existing pages still render correctly inside the new shell.

3. **Data helpers**
   - Add `getOverviewKpis`, `getAllFundsForScatter`, `getFundPeerStats` to `lib/queries.ts` with full TypeScript types.
   - Add `/api/funds/search` route handler for the topbar search.

4. **Overview page (`/`)**
   - `<KpiStrip>`, `<RiskReturnScatter>`, `<HighestPerCategory>`.
   - Replace the existing categories grid as the home page.

5. **Category workbench (`/categories/[category]`)**
   - Create the new route. Add redirect from `/rankings/[category]`.
   - `<RankingsGrid>` (AG Grid) with column toggle and URL-driven selection.
   - `<FundDetailPanel>` with three tabs.
   - Wire `<EmptyDetail>` for the no-selection state.

6. **Fund detail refresh (`/funds/[ticker]`)**
   - Re-style with the new tokens and `<ScoreBar>` shared component. Layout stays mostly the same.

7. **Phase 2 placeholders**
   - `/compare`, `/scatter`, `/distribution` routes each rendering `<ComingSoonPanel>`.

8. **Verification**
   - Browser walkthrough of each route, signed in as both a regular user and an admin.
   - Confirm RLS still gates everything.
   - Confirm the old `/rankings/[category]` redirect works.
   - Confirm decision-support copy is in place (no "best/winner" language).
   - Visual check against this spec's typography, color, and density rules.

---

## Out of Scope (Phase 1)

The following are explicitly deferred:

- **Comparison feature** — the `/compare` page is a placeholder.
- **Scatter explorer page** — the in-overview preview is built, but the full `/scatter` page is a placeholder.
- **Distribution charts** — `/distribution` is a placeholder.
- **Time-series tracking** — historical ranking data is not currently captured. Data-model decisions to support this are a separate scope.
- **Marketplace API integration** for live market data hover tooltips. The slot is reserved (`Market Data` tab placeholder + `<FundDetailPanel>` design accommodates it), but no API work is in Phase 1.
- **Test infrastructure.** None exists currently; adding it is its own decision. Verification in Phase 1 is manual browser walkthrough.
- **Changes to scoring logic, formulas page, upload page, or auth flows.** No DB migrations.

---

## Risks & Open Questions

- **AG Grid licensing.** AG Grid Community is sufficient for sortable/filterable tables with custom cell renderers. If we later want pivoting, server-side row models, or column sets, that becomes a paid Enterprise dependency — flag before adopting.
- **AG Charts licensing.** Same: Community version covers scatter, line, bar, and radar. Should be fine for Phase 1.
- **Overview scatter performance.** ~400 funds rendered in AG Charts is well within budget; no performance concern at current scale. Revisit if the dataset grows past a few thousand funds.
- **Sidebar category list growth.** Currently ~8 categories; sidebar comfortably handles up to ~25. Beyond that, consider a search/filter inside the sidebar.

---

## Verification Checklist (Phase 1 done)

- [ ] All Phase 1 routes load without errors as both regular user and admin.
- [ ] Old `/rankings/[category]` URLs redirect to `/categories/[category]`.
- [ ] Sidebar highlights the active route correctly across all routes.
- [ ] Fund search in topbar finds funds by ticker and routes correctly.
- [ ] Clicking a row in the workbench grid updates `?fund=` in the URL and populates the right panel.
- [ ] Reloading a `?fund=TICKER` URL renders the panel populated.
- [ ] Score colors match the spec's three-tier semantic palette.
- [ ] Typography: Inter for UI, JetBrains Mono with tabular-nums for all numeric values.
- [ ] No "best/winner/top pick" language anywhere in copy.
- [ ] Admin-only links remain admin-only.
- [ ] Loading skeletons appear for each route during navigation.
- [ ] Error boundary on each route surfaces real errors with a retry option.
- [ ] Motion: right-panel transitions are smooth and not distracting.
- [ ] Dark mode renders correctly with the new tokens.
