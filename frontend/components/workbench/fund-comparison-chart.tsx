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
  const gridColor = isDark ? "#374151" : "#d4d4d4";

  const selectedRows = useMemo(
    () => selectedTickers.map((t) => rows.find((r) => r.ticker === t)).filter(Boolean) as RankingRow[],
    [rows, selectedTickers]
  );

  const rowByTicker = useMemo(
    () => Object.fromEntries(selectedRows.map((r) => [r.ticker, r])),
    [selectedRows]
  );

  const options = useMemo<AgCartesianChartOptions>(() => {
    const data = METRICS.map(({ label, key }) => {
      const row: Record<string, string | number> = { label };
      selectedTickers.forEach((ticker) => {
        const fund = rowByTicker[ticker];
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
      padding: { top: 8, right: 8, bottom: 0, left: 0 },
      legend: {
        position: "bottom",
        spacing: 8,
        item: { label: { color: labelColor } },
      },
      series,
      axes: {
        x: {
          type: "category",
          position: "left",
          label: { color: labelColor, fontSize: 11 },
        },
        y: {
          type: "number",
          position: "bottom",
          min: 0,
          max: 100,
          label: { color: labelColor, fontSize: 11 },
          gridLine: { style: [{ stroke: gridColor, lineDash: [2, 4] }] },
        },
      },
    };
  }, [selectedTickers, rowByTicker, isDark, labelColor, gridColor]);

  return (
    <div className="h-[210px]">
      <AgCharts options={options} />
    </div>
  );
}
