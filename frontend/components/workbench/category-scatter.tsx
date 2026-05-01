"use client";

import "@/lib/ag-charts-setup";
import { AgCharts } from "ag-charts-react";
import type { AgCartesianChartOptions } from "ag-charts-community";
import { useMemo, useState } from "react";
import type { RankingRow } from "@/components/workbench/rankings-grid";
import { useIsDarkMode } from "@/lib/use-color-scheme";
import { SELECTION_COLORS } from "@/lib/selection-colors";

type EfficiencyView = "3yr" | "5yr";
type EfficiencyPoint = {
  ticker: string;
  name: string;
  efficiencyRisk: number;
  efficiencyReturn: number;
};

const VIEW_CONFIG = {
  "3yr": {
    label: "3Y",
    riskKey: "stdDev3yr",
    returnKey: "return3yr",
    xTitle: "3Y Standard Deviation",
    yTitle: "3Y Return",
  },
  "5yr": {
    label: "5Y",
    riskKey: "stdDev5yr",
    returnKey: "return5yr",
    xTitle: "5Y Standard Deviation",
    yTitle: "5Y Return",
  },
} satisfies Record<
  EfficiencyView,
  {
    label: string;
    riskKey: keyof RankingRow;
    returnKey: keyof RankingRow;
    xTitle: string;
    yTitle: string;
  }
>;

function buildEfficiencyPoints(
  rows: RankingRow[],
  view: EfficiencyView
): EfficiencyPoint[] {
  const config = VIEW_CONFIG[view];
  return rows.flatMap((row) => {
    const risk = row[config.riskKey];
    const fundReturn = row[config.returnKey];
    if (typeof risk !== "number" || typeof fundReturn !== "number") return [];
    return [{ ticker: row.ticker, name: row.name, efficiencyRisk: risk, efficiencyReturn: fundReturn }];
  });
}

export function CategoryScatterChart({
  rows,
  selectedTickers,
}: {
  rows: RankingRow[];
  selectedTickers: string[];
}) {
  const isDark = useIsDarkMode();
  const [view, setView] = useState<EfficiencyView>("3yr");
  const viewConfig = VIEW_CONFIG[view];
  const labelColor = isDark ? "#a3a3a3" : "#737373";
  const gridColor = isDark ? "#374151" : "#d4d4d4";
  const bgDot = isDark ? "#9ca3af" : "#525252";
  const bgDotStroke = isDark ? "#d1d5db" : "#171717";
  const selectedStroke = isDark ? "#dbeafe" : "#0f172a";

  const selectedSet = useMemo(
    () => new Set(selectedTickers),
    [selectedTickers]
  );

  const points = useMemo(() => buildEfficiencyPoints(rows, view), [rows, view]);

  const options = useMemo<AgCartesianChartOptions>(() => {
    const byTicker = new Map<string, EfficiencyPoint[]>();
    const backgroundData: EfficiencyPoint[] = [];
    for (const point of points) {
      if (selectedSet.has(point.ticker)) {
        const bucket = byTicker.get(point.ticker) ?? [];
        bucket.push(point);
        byTicker.set(point.ticker, bucket);
      } else {
        backgroundData.push(point);
      }
    }

    const selectedSeries = selectedTickers.map((ticker, i) => ({
      type: "scatter" as const,
      data: byTicker.get(ticker) ?? [],
      xKey: "efficiencyRisk",
      yKey: "efficiencyReturn",
      title: ticker,
      fill: SELECTION_COLORS[i % SELECTION_COLORS.length],
      size: 11,
      stroke: selectedStroke,
      strokeWidth: 1.5,
      tooltip: {
        renderer: ({ datum }: { datum: EfficiencyPoint }) => ({
          heading: datum.ticker,
          content: `${datum.name}<br/>Std Dev ${datum.efficiencyRisk.toFixed(2)}% · Return ${datum.efficiencyReturn.toFixed(2)}%`,
        }),
      },
    }));

    return {
      theme: isDark ? "ag-default-dark" : "ag-default",
      background: { fill: "transparent" },
      padding: { top: 8, right: 8, bottom: 0, left: 0 },
      legend: {
        position: "bottom",
        spacing: 8,
        item: { label: { color: labelColor } },
      },
      series: [
        {
          type: "scatter",
          data: backgroundData,
          xKey: "efficiencyRisk",
          yKey: "efficiencyReturn",
          title: "Category funds",
          fill: bgDot,
          stroke: bgDotStroke,
          strokeWidth: 1,
          size: 6,
          fillOpacity: isDark ? 0.78 : 0.58,
          strokeOpacity: isDark ? 0.35 : 0.18,
          tooltip: {
            renderer: ({ datum }: { datum: EfficiencyPoint }) => ({
              heading: datum.ticker,
              content: `Std Dev ${datum.efficiencyRisk.toFixed(2)}% · Return ${datum.efficiencyReturn.toFixed(2)}%`,
            }),
          },
        },
        ...selectedSeries,
      ],
      axes: {
        x: {
          type: "number",
          position: "bottom",
          title: { text: viewConfig.xTitle, color: labelColor },
          label: { color: labelColor, fontSize: 11 },
          gridStyle: [{ stroke: gridColor, lineDash: [2, 4] }],
        },
        y: {
          type: "number",
          position: "left",
          title: { text: viewConfig.yTitle, color: labelColor },
          label: { color: labelColor, fontSize: 11 },
          gridStyle: [{ stroke: gridColor, lineDash: [2, 4] }],
        },
      },
    };
  }, [points, selectedTickers, selectedSet, isDark, labelColor, gridColor, bgDot, bgDotStroke, selectedStroke, viewConfig]);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <div className="inline-flex rounded-md border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-0.5">
          {(["3yr", "5yr"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={`h-7 rounded px-3 text-xs font-medium ${
                view === option
                  ? "bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {VIEW_CONFIG[option].label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[300px]">
        <AgCharts options={options} />
      </div>
    </div>
  );
}
