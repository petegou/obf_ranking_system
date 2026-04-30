# Risk/Return Scatter Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the per-category risk/return scatter into the fund detail panel, add an efficient frontier curve, and support multi-fund selection with a grouped-bar comparison view.

**Architecture:** The category page passes its already-fetched `rows` array and a `selectedTickers: string[]` (read from repeated `?fund=` URL params) down to `FundDetailPanel`. The panel branches on selection count: single fund → existing tab layout with scatter added to "vs Peers"; multi-fund → comparison grouped-bar chart + scatter. Two new client components handle the charts. The rankings grid switches to multi-row selection and toggles tickers in/out of the URL.

**Tech Stack:** Next.js App Router (server components), AG Charts (`ag-charts-react`), AG Grid (`ag-grid-react`), TypeScript, Tailwind CSS.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `frontend/app/(workbench)/categories/[category]/page.tsx` | Read `selectedTickers[]` from URL, pass to panel, widen aside |
| Modify | `frontend/components/workbench/rankings-grid.tsx` | Multi-row select, toggle tickers in URL |
| Create | `frontend/lib/selection-colors.ts` | Shared color palette for selected funds |
| Create | `frontend/components/workbench/category-scatter.tsx` | Scatter + frontier chart (client) |
| Create | `frontend/components/workbench/fund-comparison-chart.tsx` | Grouped bar chart for multi-fund (client) |
| Modify | `frontend/components/workbench/fund-detail-panel.tsx` | New signature, single vs multi branch, add scatter to "vs Peers" |

---

## Task 1: Category page — read selectedTickers, pass to panel, widen aside

**Files:**
- Modify: `frontend/app/(workbench)/categories/[category]/page.tsx`

- [ ] **Step 1: Update PageProps and read selectedTickers**

Replace the entire file with:

```tsx
import { Suspense } from "react";
import { EmptyDetail } from "@/components/workbench/empty-detail";
import { FundDetailPanel } from "@/components/workbench/fund-detail-panel";
import { PanelMotion } from "@/components/workbench/panel-motion";
import { RankingsGrid, type RankingRow } from "@/components/workbench/rankings-grid";
import { getRankingsForCategory } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ fund?: string | string[] }>;
}

export default async function CategoryWorkbenchPage({
  params,
  searchParams,
}: PageProps) {
  const { category: rawCategory } = await params;
  const { fund } = await searchParams;
  const category = decodeURIComponent(rawCategory);
  const result = await getRankingsForCategory(category);

  const rows: RankingRow[] = result.rankings.map((ranking) => ({
    rank: ranking.rank,
    ticker: ranking.ticker,
    name: ranking.name,
    totalGpaScore: ranking.total_gpa_score,
    riskScore: ranking.risk_score,
    returnScore: ranking.return_score,
    marketCapScore: ranking.market_cap_score,
    turnoverScore: ranking.turnover_score,
  }));

  const selectedTickers: string[] = fund
    ? Array.isArray(fund) ? fund : [fund]
    : [];

  const panelKey = [...selectedTickers].sort().join(",");

  return (
    <div className="h-full flex">
      <section className="flex-1 min-w-0 flex flex-col">
        <header className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]">
          <h1 className="text-base font-semibold tracking-tight">{category}</h1>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            {rows.length} funds ranked by Oak Bridge multi-factor GPA -
            decision support only.
          </p>
        </header>
        <div className="flex-1 min-h-0">
          <RankingsGrid rows={rows} category={category} />
        </div>
      </section>
      <aside
        className={`shrink-0 border-l border-[var(--border-subtle)] bg-[var(--surface-card)] flex flex-col min-h-0 overflow-hidden transition-[width] duration-200 ${
          selectedTickers.length > 0 ? "w-[640px]" : "w-80"
        }`}
      >
        {selectedTickers.length > 0 ? (
          <Suspense
            key={panelKey}
            fallback={<div className="p-4 flex-1 min-h-0 text-xs">Loading...</div>}
          >
            <PanelMotion key={panelKey}>
              <FundDetailPanel tickers={selectedTickers} rows={rows} />
            </PanelMotion>
          </Suspense>
        ) : (
          <EmptyDetail />
        )}
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only about `FundDetailPanel` prop mismatch (its signature hasn't changed yet). That's fine — we'll fix it in Task 5.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/\(workbench\)/categories/\[category\]/page.tsx
git commit -m "feat: pass selectedTickers and rows to FundDetailPanel, widen aside"
```

---

## Task 2: Rankings grid — multi-select, toggle tickers in URL

**Files:**
- Modify: `frontend/components/workbench/rankings-grid.tsx`

- [ ] **Step 1: Replace the grid component logic**

Replace the entire file with:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import type {
  ColDef,
  GridReadyEvent,
  RowSelectedEvent,
  ValueFormatterParams,
} from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { scoreColorVar } from "@/lib/score-color";
import { useIsDarkMode } from "@/lib/use-color-scheme";

ModuleRegistry.registerModules([AllCommunityModule]);

const gridThemeLight = themeQuartz.withParams({
  backgroundColor: "#ffffff",
  foregroundColor: "#0a0a0a",
  borderColor: "#ececec",
  chromeBackgroundColor: "#fafafa",
  headerBackgroundColor: "#fafafa",
  headerTextColor: "#525252",
  rowHoverColor: "#f5f5f5",
  selectedRowBackgroundColor: "rgba(13, 31, 51, 0.04)",
  accentColor: "#0d1f33",
  fontSize: 13,
  fontFamily: "inherit",
});

const gridThemeDark = themeQuartz.withParams({
  backgroundColor: "#141414",
  foregroundColor: "#fafafa",
  borderColor: "#262626",
  chromeBackgroundColor: "#0a0a0a",
  headerBackgroundColor: "#0a0a0a",
  headerTextColor: "#a3a3a3",
  rowHoverColor: "#1f1f1f",
  selectedRowBackgroundColor: "rgba(74, 143, 212, 0.08)",
  accentColor: "#4a8fd4",
  fontSize: 13,
  fontFamily: "inherit",
});

export interface RankingRow {
  rank: number;
  ticker: string;
  name: string;
  totalGpaScore: number;
  riskScore: number;
  returnScore: number;
  marketCapScore: number;
  turnoverScore: number;
}

function scoreCellRenderer(params: ValueFormatterParams<RankingRow, number>) {
  const value = params.value;
  if (typeof value !== "number") return "";
  return value.toFixed(1);
}

function ScoreCell({ value }: { value: number }) {
  return (
    <span
      className="font-mono tabular-nums font-medium"
      style={{ color: scoreColorVar(value) }}
    >
      {value.toFixed(2)}
    </span>
  );
}

export function RankingsGrid({
  rows,
  category,
}: {
  rows: RankingRow[];
  category: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDark = useIsDarkMode();
  const selectedTickers = searchParams.getAll("fund");
  const tickerKey = selectedTickers.join(",");

  const [api, setApi] = useState<GridReadyEvent<RankingRow>["api"] | null>(null);

  const columns = useMemo<ColDef<RankingRow>[]>(
    () => [
      {
        headerName: "#",
        field: "rank",
        width: 70,
        cellClass: "font-mono tabular-nums",
      },
      {
        headerName: "Ticker",
        field: "ticker",
        width: 100,
        cellClass: "font-mono font-medium",
      },
      { headerName: "Name", field: "name", flex: 1, minWidth: 220 },
      {
        headerName: "GPA",
        field: "totalGpaScore",
        width: 90,
        valueFormatter: scoreCellRenderer,
        cellRenderer: (params: { value: number }) => (
          <ScoreCell value={params.value} />
        ),
        type: "rightAligned",
      },
      {
        headerName: "Risk",
        field: "riskScore",
        width: 90,
        valueFormatter: scoreCellRenderer,
        cellRenderer: (params: { value: number }) => (
          <ScoreCell value={params.value} />
        ),
        type: "rightAligned",
      },
      {
        headerName: "Return",
        field: "returnScore",
        width: 90,
        valueFormatter: scoreCellRenderer,
        cellRenderer: (params: { value: number }) => (
          <ScoreCell value={params.value} />
        ),
        type: "rightAligned",
      },
      {
        headerName: "Mkt Cap",
        field: "marketCapScore",
        width: 100,
        valueFormatter: scoreCellRenderer,
        cellRenderer: (params: { value: number }) => (
          <ScoreCell value={params.value} />
        ),
        type: "rightAligned",
      },
      {
        headerName: "Turnover",
        field: "turnoverScore",
        width: 100,
        valueFormatter: scoreCellRenderer,
        cellRenderer: (params: { value: number }) => (
          <ScoreCell value={params.value} />
        ),
        type: "rightAligned",
      },
    ],
    []
  );

  // Sync grid selection state from URL on mount and when URL changes
  useEffect(() => {
    if (!api) return;
    api.forEachNode((node) => {
      node.setSelected(selectedTickers.includes(node.data?.ticker ?? ""), false, true);
    });
    const firstTicker = selectedTickers[0];
    if (firstTicker) {
      const node = api.getRowNode(firstTicker);
      if (node) api.ensureNodeVisible(node, "middle");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, tickerKey]);

  function onRowSelected(event: RowSelectedEvent<RankingRow>) {
    const ticker = event.data?.ticker;
    if (!ticker) return;

    const current = searchParams.getAll("fund");
    const isNowSelected = event.node.isSelected();

    const next = isNowSelected
      ? current.includes(ticker) ? current : [...current, ticker]
      : current.filter((t) => t !== ticker);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("fund");
    next.forEach((t) => params.append("fund", t));

    router.replace(
      `/categories/${encodeURIComponent(category)}?${params.toString()}`,
      { scroll: false }
    );
  }

  return (
    <div style={{ height: "100%" }}>
      <AgGridReact<RankingRow>
        theme={isDark ? gridThemeDark : gridThemeLight}
        rowData={rows}
        columnDefs={columns}
        rowSelection="multiple"
        getRowId={(params) => params.data.ticker}
        onGridReady={(event) => setApi(event.api)}
        onRowSelected={onRowSelected}
        suppressCellFocus
        animateRows
        rowHeight={32}
        headerHeight={32}
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: same `FundDetailPanel` prop errors from Task 1 only — no new errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/workbench/rankings-grid.tsx
git commit -m "feat: switch grid to multi-select, toggle fund tickers in URL"
```

---

## Task 3: Selection colors constant + CategoryScatterChart

**Files:**
- Create: `frontend/lib/selection-colors.ts`
- Create: `frontend/components/workbench/category-scatter.tsx`

- [ ] **Step 1: Create the shared selection color palette**

Create `frontend/lib/selection-colors.ts`:

```ts
export const SELECTION_COLORS = [
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#a855f7", // purple
  "#ef4444", // red
  "#14b8a6", // teal
];
```

- [ ] **Step 2: Create the CategoryScatterChart component**

Create `frontend/components/workbench/category-scatter.tsx`:

```tsx
"use client";

import "@/lib/ag-charts-setup";
import { AgCharts } from "ag-charts-react";
import type { AgCartesianChartOptions } from "ag-charts-community";
import { useMemo } from "react";
import type { RankingRow } from "@/components/workbench/rankings-grid";
import { useIsDarkMode } from "@/lib/use-color-scheme";
import { SELECTION_COLORS } from "@/lib/selection-colors";

function computeFrontier(rows: RankingRow[]): { x: number; y: number }[] {
  const sorted = [...rows].sort((a, b) => a.riskScore - b.riskScore);
  const frontier: { x: number; y: number }[] = [];
  let maxReturn = -Infinity;
  for (const row of sorted) {
    if (row.returnScore > maxReturn) {
      maxReturn = row.returnScore;
      frontier.push({ x: row.riskScore, y: row.returnScore });
    }
  }
  return frontier;
}

export function CategoryScatterChart({
  rows,
  selectedTickers,
}: {
  rows: RankingRow[];
  selectedTickers: string[];
}) {
  const isDark = useIsDarkMode();
  const labelColor = isDark ? "#a3a3a3" : "#737373";
  const bgDot = isDark ? "#404040" : "#d4d4d4";
  const frontierStroke = isDark ? "#4a8fd4" : "#0d1f33";

  const selectedSet = useMemo(
    () => new Set(selectedTickers),
    [selectedTickers]
  );

  const frontier = useMemo(() => computeFrontier(rows), [rows]);

  const options = useMemo<AgCartesianChartOptions>(() => {
    const backgroundData = rows.filter((r) => !selectedSet.has(r.ticker));

    const selectedSeries = selectedTickers.map((ticker, i) => ({
      type: "scatter" as const,
      data: rows.filter((r) => r.ticker === ticker),
      xKey: "riskScore",
      yKey: "returnScore",
      title: ticker,
      marker: {
        fill: SELECTION_COLORS[i % SELECTION_COLORS.length],
        size: 9,
        strokeWidth: 0,
      },
      tooltip: {
        renderer: ({ datum }: { datum: RankingRow }) => ({
          heading: datum.ticker,
          content: `${datum.name}<br/>Risk ${datum.riskScore.toFixed(1)} · Return ${datum.returnScore.toFixed(1)}`,
        }),
      },
    }));

    return {
      theme: isDark ? "ag-default-dark" : "ag-default",
      background: { fill: "transparent" },
      legend: {
        position: "bottom",
        item: { label: { color: labelColor } },
      },
      series: [
        {
          type: "scatter",
          data: backgroundData,
          xKey: "riskScore",
          yKey: "returnScore",
          title: "Category funds",
          marker: {
            fill: bgDot,
            size: 5,
            strokeWidth: 0,
            fillOpacity: 0.5,
          },
          tooltip: {
            renderer: ({ datum }: { datum: RankingRow }) => ({
              heading: datum.ticker,
              content: `Risk ${datum.riskScore.toFixed(1)} · Return ${datum.returnScore.toFixed(1)}`,
            }),
          },
        },
        ...selectedSeries,
        {
          type: "line",
          data: frontier,
          xKey: "x",
          yKey: "y",
          title: "Frontier",
          stroke: frontierStroke,
          strokeWidth: 2,
          strokeOpacity: 0.5,
          marker: { enabled: false },
        },
      ],
      axes: {
        x: {
          type: "number",
          position: "bottom",
          title: { text: "Risk Score", color: labelColor },
          label: { color: labelColor },
          min: 0,
          max: 100,
        },
        y: {
          type: "number",
          position: "left",
          title: { text: "Return Score", color: labelColor },
          label: { color: labelColor },
          min: 0,
          max: 100,
        },
      },
    };
  }, [rows, selectedTickers, selectedSet, frontier, isDark, labelColor, bgDot, frontierStroke]);

  return (
    <div className="h-[280px]">
      <AgCharts options={options} />
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: only the pre-existing `FundDetailPanel` prop errors. No errors in the new files.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/selection-colors.ts frontend/components/workbench/category-scatter.tsx
git commit -m "feat: add CategoryScatterChart with efficient frontier curve"
```

---

## Task 4: FundComparisonChart — grouped bars for multi-fund selection

**Files:**
- Create: `frontend/components/workbench/fund-comparison-chart.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/components/workbench/fund-comparison-chart.tsx`:

```tsx
"use client";

import "@/lib/ag-charts-setup";
import { AgCharts } from "ag-charts-react";
import type { AgCartesianChartOptions } from "ag-charts-community";
import { useMemo } from "react";
import type { RankingRow } from "@/components/workbench/rankings-grid";
import { useIsDarkMode } from "@/lib/use-color-scheme";
import { SELECTION_COLORS } from "@/lib/selection-colors";

const METRICS: { label: string; key: keyof RankingRow }[] = [
  { label: "GPA", key: "totalGpaScore" },
  { label: "Risk", key: "riskScore" },
  { label: "Return", key: "returnScore" },
  { label: "Mkt Cap", key: "marketCapScore" },
  { label: "Turnover", key: "turnoverScore" },
];

export function FundComparisonChart({
  rows,
  selectedTickers,
}: {
  rows: RankingRow[];
  selectedTickers: string[];
}) {
  const isDark = useIsDarkMode();
  const labelColor = isDark ? "#a3a3a3" : "#737373";

  const selectedRows = useMemo(
    () => selectedTickers.map((t) => rows.find((r) => r.ticker === t)).filter(Boolean) as RankingRow[],
    [rows, selectedTickers]
  );

  const options = useMemo<AgCartesianChartOptions>(() => {
    const data = METRICS.map(({ label, key }) => {
      const row: Record<string, string | number> = { label };
      selectedTickers.forEach((ticker) => {
        const fund = selectedRows.find((r) => r.ticker === ticker);
        row[ticker] = typeof fund?.[key] === "number" ? (fund[key] as number) : 0;
      });
      return row;
    });

    const series = selectedTickers.map((ticker, i) => ({
      type: "bar" as const,
      direction: "horizontal" as const,
      xKey: "label",
      yKey: ticker,
      yName: ticker,
      fill: SELECTION_COLORS[i % SELECTION_COLORS.length],
    }));

    return {
      theme: isDark ? "ag-default-dark" : "ag-default",
      data,
      background: { fill: "transparent" },
      legend: {
        position: "bottom",
        item: { label: { color: labelColor } },
      },
      series,
      axes: {
        x: {
          type: "category",
          position: "left",
          label: { color: labelColor },
        },
        y: {
          type: "number",
          position: "bottom",
          min: 0,
          max: 100,
          label: { color: labelColor },
        },
      },
    };
  }, [selectedTickers, selectedRows, isDark, labelColor]);

  return (
    <div className="h-[240px]">
      <AgCharts options={options} />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: only the pre-existing `FundDetailPanel` prop errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/workbench/fund-comparison-chart.tsx
git commit -m "feat: add FundComparisonChart grouped bar chart for multi-fund selection"
```

---

## Task 5: FundDetailPanel — new signature, single vs multi branch

**Files:**
- Modify: `frontend/components/workbench/fund-detail-panel.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
import Link from "next/link";
import { ScoreBar } from "@/components/score-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFundDetail, getFundPeerStats } from "@/lib/queries";
import { scoreColorVar } from "@/lib/score-color";
import { MarketDataPlaceholder } from "./market-data-placeholder";
import { PeerComparisonChart } from "./peer-comparison-chart";
import { CategoryScatterChart } from "./category-scatter";
import { FundComparisonChart } from "./fund-comparison-chart";
import type { RankingRow } from "./rankings-grid";

export async function FundDetailPanel({
  tickers,
  rows,
}: {
  tickers: string[];
  rows: RankingRow[];
}) {
  // Multi-fund comparison mode
  if (tickers.length >= 2) {
    return (
      <div className="p-4 flex-1 min-h-0 overflow-y-auto">
        <header className="mb-4">
          <div className="flex flex-wrap gap-2">
            {tickers.map((t) => (
              <span key={t} className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                {t}
              </span>
            ))}
          </div>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            Comparing {tickers.length} funds — decision support only.
          </p>
        </header>
        <FundComparisonChart rows={rows} selectedTickers={tickers} />
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
            Risk vs Return
          </p>
          <CategoryScatterChart rows={rows} selectedTickers={tickers} />
        </div>
      </div>
    );
  }

  // Single-fund mode
  const ticker = tickers[0];
  const [fund, peer] = await Promise.all([
    getFundDetail(ticker),
    getFundPeerStats(ticker),
  ]);

  if (!fund) {
    return (
      <div className="p-4 flex-1 min-h-0 text-sm text-[var(--text-tertiary)]">
        Fund {ticker} not found in current rankings.
      </div>
    );
  }

  const totalScore = fund.total_gpa_score ?? 0;

  return (
    <div className="p-4 flex-1 min-h-0 overflow-y-auto">
      <header className="mb-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-mono text-lg font-semibold text-[var(--text-primary)]">
            {fund.ticker}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            Rank {fund.rank ?? "-"}
          </div>
        </div>
        <div className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
          {fund.name}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className="font-mono text-3xl font-semibold tabular-nums"
            style={{ color: scoreColorVar(totalScore) }}
          >
            {totalScore.toFixed(1)}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">
            of 100 GPA
          </span>
        </div>
      </header>

      <Tabs defaultValue="overview">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1 text-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="peers" className="flex-1 text-xs">
            vs Peers
          </TabsTrigger>
          <TabsTrigger value="market" className="flex-1 text-xs">
            Market
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-2">
          <ScoreBar label="Risk" value={fund.risk_score ?? 0} />
          <ScoreBar label="Return" value={fund.return_score ?? 0} />
          <ScoreBar label="Market Cap" value={fund.market_cap_score ?? 0} />
          <ScoreBar label="Turnover" value={fund.turnover_score ?? 0} />
          <Link
            href={`/funds/${encodeURIComponent(fund.ticker)}`}
            className="mt-4 inline-block text-xs font-medium text-[var(--brand-primary)] no-underline hover:underline"
          >
            View full detail -&gt;
          </Link>
        </TabsContent>

        <TabsContent value="peers" className="mt-4 space-y-4">
          {peer && peer.metrics.length > 0 ? (
            <PeerComparisonChart metrics={peer.metrics} />
          ) : (
            <p className="text-xs text-[var(--text-tertiary)]">
              Peer comparison unavailable for this fund.
            </p>
          )}
          <div>
            <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
              Risk vs Return
            </p>
            <CategoryScatterChart rows={rows} selectedTickers={[ticker]} />
          </div>
        </TabsContent>

        <TabsContent value="market" className="mt-4">
          <MarketDataPlaceholder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Type-check — expect zero errors**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no output (zero errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/components/workbench/fund-detail-panel.tsx
git commit -m "feat: update FundDetailPanel for multi-select with scatter and comparison chart"
```

---

## Manual Verification Checklist

After all tasks complete, verify the following in the browser at `http://localhost:3000`:

- [ ] Navigate to any category (e.g., Energy Equity)
- [ ] Click one fund → aside expands to 640px, "vs Peers" tab shows bar chart + scatter with one highlighted dot and frontier curve
- [ ] Click a second fund → comparison view appears with grouped bars (one color per fund) + scatter with two highlighted dots
- [ ] Click a highlighted row again → it deselects and is removed from the scatter
- [ ] Deselect all funds → aside collapses back to 320px and shows EmptyDetail
- [ ] Refresh the page with `?fund=A&fund=B` in the URL → both funds are pre-selected on load
- [ ] Toggle dark mode (system preference) → scatter and bars adapt correctly
