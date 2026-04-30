"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const isSyncing = useRef(false);

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
    const tickers = tickerKey ? tickerKey.split(",") : [];
    isSyncing.current = true;
    api.forEachNode((node) => {
      node.setSelected(tickers.includes(node.data?.ticker ?? ""), false, "api");
    });
    isSyncing.current = false;
    const firstTicker = tickers[0];
    if (firstTicker) {
      const node = api.getRowNode(firstTicker);
      if (node) api.ensureNodeVisible(node, "middle");
    }
  }, [api, tickerKey]);

  function onRowSelected(event: RowSelectedEvent<RankingRow>) {
    if (isSyncing.current) return;
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
