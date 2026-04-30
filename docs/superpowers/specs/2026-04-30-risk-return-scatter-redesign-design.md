# Risk/Return Scatter Redesign — Design Spec
**Date:** 2026-04-30
**Status:** Approved

---

## Goal

Move the risk/return scatter from the overview page (1,000 unreadable dots) into the category workbench, where it shows only the selected category's funds. Add an efficient frontier curve. Support multi-fund selection with a side-by-side grouped bar comparison.

---

## Section 1 — Layout & Panel Width

The category page aside changes width based on selection state:

| State | Aside width |
|---|---|
| No fund selected | `w-80` (320px) — unchanged |
| 1+ funds selected | `w-[640px]` |

The table section remains `flex-1` and compresses naturally. No animation changes needed — `PanelMotion` already handles the transition.

---

## Section 2 — Data Flow

No new Supabase queries. The category page already fetches `getRankingsForCategory`, which returns all funds in the category with `riskScore`, `returnScore`, `totalGpaScore`, `marketCapScore`, and `turnoverScore`.

These `rows` are passed as a prop from `CategoryWorkbenchPage` down to the panel. The panel passes them to the scatter component. No waterfall, no additional round-trips.

---

## Section 3 — Multi-select & URL

**Grid:** `rowSelection` changes from `"single"` to `"multiple"`. Clicking a row toggles its ticker in/out of the URL params. Shift/cmd click follows AG Grid's default multi-select behavior.

**URL shape:** Repeated `fund` params — e.g. `?fund=ATMP&fund=MLPTX`. Read via `useSearchParams().getAll('fund')` which returns a `string[]`.

**Panel mode:** Determined by `selectedTickers.length`:
- `=== 1` → single-fund mode (existing header + tabs layout, scatter added to "vs Peers" tab)
- `>= 2` → comparison mode (grouped bar chart + scatter, no tabs)

---

## Section 4 — Scatter + Frontier Chart

**Component:** `CategoryScatterChart` (new client component)

**Props:**
```ts
{
  rows: RankingRow[];          // all funds in category
  selectedTickers: string[];   // highlighted funds
  isDark: boolean;
}
```

**Selection color palette:** A fixed set of 5 distinct colors used consistently across both the scatter markers and the grouped bar chart — `["#3b82f6", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6"]`. Color assigned by index in `selectedTickers` array so the first selected fund always gets blue, second amber, etc.

**Scatter series:**
- Non-selected funds: small muted grey dots (`opacity: 0.4`, `size: 5`)
- Selected funds: larger markers (`size: 9`), one color per ticker from the selection palette above

**Frontier curve:**
- Computed client-side as a Pareto front:
  1. Sort all category funds by `riskScore` ascending
  2. Sweep through maintaining a running max of `returnScore`
  3. Collect points where `returnScore > runningMax` (these are the frontier points)
- Rendered as a `line` series in AG Charts — no fill, accent color (`--brand-primary`), `strokeWidth: 2`, slight opacity

**Axes:** X = Risk Score (0–100), Y = Return Score (0–100). Dark mode via `useIsDarkMode()`.

---

## Section 5 — Component Breakdown

### Files changed

**`frontend/app/(workbench)/categories/[category]/page.tsx`**
- Read `selectedTickers = searchParams.getAll('fund')`
- Pass `rows` and `selectedTickers` to the panel component
- Aside: `w-80` when empty, `w-[640px]` when `selectedTickers.length > 0`

**`frontend/components/workbench/rankings-grid.tsx`**
- `rowSelection="multiple"`
- `onRowSelected` toggles tickers in URL param list (add if not present, remove if present)
- On grid ready, select all rows matching `selectedTickers` from URL

**`frontend/components/workbench/fund-detail-panel.tsx`**
- Signature changes from `{ ticker: string }` to `{ tickers: string[], rows: RankingRow[] }`
- Single mode (`tickers.length === 1`): uses `tickers[0]` to fetch `getFundDetail` and `getFundPeerStats` (existing server fetches unchanged); "vs Peers" tab renders `PeerComparisonChart` (existing) above `CategoryScatterChart` (new)
- Comparison mode (`tickers.length >= 2`): no per-fund server fetches needed; renders `FundComparisonChart` (grouped bars sourced from `rows` filtered to `tickers`) above `CategoryScatterChart`

**`frontend/components/workbench/category-scatter.tsx`** *(new)*
- Client component
- Pareto frontier computation (pure function, no side effects)
- AG Charts scatter + line series
- Respects dark mode

**`frontend/components/workbench/fund-comparison-chart.tsx`** *(new)*
- Client component
- Grouped horizontal bar chart: one group per metric (GPA, Risk, Return, Mkt Cap, Turnover), one bar per selected fund
- Same color palette as scatter selected-fund markers
- Reuses `useIsDarkMode()` and AG Charts setup

### Files unchanged
- `overview/risk-return-scatter.tsx` — the overview scatter stays as-is (broad landscape view)
- `peer-comparison-chart.tsx` — reused as-is in single-fund mode
- `app-shell.tsx`, `sidebar.tsx`, `queries.ts` — untouched

---

## Out of Scope

- Removing or modifying the overview scatter
- Changes to the ranking/scoring logic
- New database queries or migrations
- Any route outside the category workbench
