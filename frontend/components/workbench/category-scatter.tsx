"use client";

import "@/lib/ag-charts-setup";
import { AgCharts } from "ag-charts-react";
import type { AgCartesianChartOptions } from "ag-charts-community";
import { useMemo } from "react";
import type { RankingRow } from "@/components/workbench/rankings-grid";
import { useIsDarkMode } from "@/lib/use-color-scheme";
import { SELECTION_COLORS } from "@/lib/selection-colors";

function computeFrontier(rows: RankingRow[]): { x: number; y: number }[] {
  const sorted = [...rows].sort((a, b) =>
    a.riskScore !== b.riskScore
      ? a.riskScore - b.riskScore
      : b.returnScore - a.returnScore
  );
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
