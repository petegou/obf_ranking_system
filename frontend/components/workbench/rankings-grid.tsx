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
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { scoreColorVar } from "@/lib/score-color";

ModuleRegistry.registerModules([AllCommunityModule]);

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
  const selectedTicker = searchParams.get("fund");
  const [api, setApi] = useState<GridReadyEvent<RankingRow>["api"] | null>(
    null
  );

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

  useEffect(() => {
    if (!api || !selectedTicker) return;
    const node = api.getRowNode(selectedTicker);
    if (node) {
      node.setSelected(true, true);
      api.ensureNodeVisible(node, "middle");
    }
  }, [api, selectedTicker]);

  function onRowSelected(event: RowSelectedEvent<RankingRow>) {
    if (!event.node.isSelected()) return;
    const ticker = event.data?.ticker;
    if (!ticker) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("fund", ticker);
    router.replace(
      `/categories/${encodeURIComponent(category)}?${params.toString()}`,
      { scroll: false }
    );
  }

  return (
    <div className="ag-theme-quartz h-full" style={{ height: "100%" }}>
      <AgGridReact<RankingRow>
        rowData={rows}
        columnDefs={columns}
        rowSelection="single"
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
