"use client";

import "@/lib/ag-charts-setup";
import { AgCharts } from "ag-charts-react";
import type { AgCartesianChartOptions } from "ag-charts-community";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { FundScatterRow } from "@/lib/queries";
import { useIsDarkMode } from "@/lib/use-color-scheme";

const CATEGORY_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#14b8a6",
  "#ec4899",
  "#f97316",
];

function colorForCategory(category: string, index: Map<string, number>): string {
  let colorIndex = index.get(category);
  if (colorIndex === undefined) {
    colorIndex = index.size % CATEGORY_COLORS.length;
    index.set(category, colorIndex);
  }
  return CATEGORY_COLORS[colorIndex];
}

export function RiskReturnScatter({ rows }: { rows: FundScatterRow[] }) {
  const router = useRouter();
  const isDark = useIsDarkMode();
  const axisLabelColor = isDark ? "#a3a3a3" : "#737373";

  const options = useMemo<AgCartesianChartOptions>(() => {
    const colorIndex = new Map<string, number>();
    const seriesByCategory = new Map<string, FundScatterRow[]>();

    for (const row of rows) {
      const items = seriesByCategory.get(row.category) ?? [];
      items.push(row);
      seriesByCategory.set(row.category, items);
    }

    return {
      theme: isDark ? "ag-default-dark" : "ag-default",
      data: rows,
      background: { fill: "transparent" },
      legend: {
        position: "bottom",
        spacing: 16,
        item: { label: { color: axisLabelColor } },
      },
      axes: {
        x: {
          type: "number",
          position: "bottom",
          title: { text: "Risk Score", color: axisLabelColor },
          label: { color: axisLabelColor },
          min: 0,
          max: 100,
        },
        y: {
          type: "number",
          position: "left",
          title: { text: "Return Score", color: axisLabelColor },
          label: { color: axisLabelColor },
          min: 0,
          max: 100,
        },
      },
      series: Array.from(seriesByCategory.entries()).map(([category, items]) => ({
        type: "scatter",
        data: items,
        xKey: "riskScore",
        yKey: "returnScore",
        sizeKey: "marketCapScore",
        sizeName: "Market Cap",
        title: category,
        fill: colorForCategory(category, colorIndex),
        fillOpacity: 0.65,
        strokeWidth: 0,
        tooltip: {
          renderer: ({ datum }: { datum: FundScatterRow }) => ({
            heading: datum.ticker,
            content: `${datum.name}<br/>Risk ${datum.riskScore.toFixed(
              1
            )} - Return ${datum.returnScore.toFixed(
              1
            )}<br/>GPA ${datum.totalGpaScore.toFixed(1)}`,
          }),
        },
        listeners: {
          seriesNodeClick: (event) => {
            const categoryParam = encodeURIComponent(event.datum.category);
            const tickerParam = encodeURIComponent(event.datum.ticker);
            router.push(`/categories/${categoryParam}?fund=${tickerParam}`);
          },
        },
      })),
    };
  }, [rows, router, isDark, axisLabelColor]);

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Risk vs Return - All Funds
      </h2>
      <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
        Bubble size reflects market-cap score. Click a point to inspect the fund.
      </p>
      <div className="h-[420px] mt-3">
        <AgCharts options={options} />
      </div>
    </div>
  );
}
