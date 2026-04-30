"use client";

import { AgCharts } from "ag-charts-react";
import type { AgCartesianChartOptions } from "ag-charts-community";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { FundScatterRow } from "@/lib/queries";

const CATEGORY_COLORS = [
  "#0d1f33",
  "#15803d",
  "#a16207",
  "#b91c1c",
  "#5b21b6",
  "#0f766e",
  "#9333ea",
  "#c2410c",
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

  const options = useMemo<AgCartesianChartOptions>(() => {
    const colorIndex = new Map<string, number>();
    const seriesByCategory = new Map<string, FundScatterRow[]>();

    for (const row of rows) {
      const items = seriesByCategory.get(row.category) ?? [];
      items.push(row);
      seriesByCategory.set(row.category, items);
    }

    return {
      data: rows,
      background: { fill: "transparent" },
      legend: { position: "bottom", spacing: 16 },
      axes: {
        x: {
          type: "number",
          position: "bottom",
          title: { text: "Risk Score", color: "#737373" },
          min: 0,
          max: 100,
        },
        y: {
          type: "number",
          position: "left",
          title: { text: "Return Score", color: "#737373" },
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
        marker: {
          fill: colorForCategory(category, colorIndex),
          fillOpacity: 0.65,
          strokeWidth: 0,
        },
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
  }, [rows, router]);

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
