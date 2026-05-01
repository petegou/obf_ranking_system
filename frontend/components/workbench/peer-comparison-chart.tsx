"use client";

import "@/lib/ag-charts-setup";
import { AgCharts } from "ag-charts-react";
import type { AgCartesianChartOptions } from "ag-charts-community";
import { useMemo } from "react";
import type { PeerMetric } from "@/lib/queries";
import { useIsDarkMode } from "@/lib/use-color-scheme";

export function PeerComparisonChart({ metrics }: { metrics: PeerMetric[] }) {
  const isDark = useIsDarkMode();
  const fundFill = isDark ? "#3b82f6" : "#0d1f33";
  const peerFill = isDark ? "#6b7280" : "#a3a3a3";
  const labelColor = isDark ? "#a3a3a3" : "#737373";
  const gridColor = isDark ? "#374151" : "#d4d4d4";

  const options = useMemo<AgCartesianChartOptions>(
    () => ({
      theme: isDark ? "ag-default-dark" : "ag-default",
      data: metrics,
      background: { fill: "transparent" },
      padding: { top: 8, right: 8, bottom: 0, left: 0 },
      legend: {
        position: "bottom",
        spacing: 8,
        item: { label: { color: labelColor } },
      },
      series: [
        {
          type: "bar",
          direction: "horizontal",
          xKey: "label",
          yKey: "fundValue",
          yName: "This fund",
          fill: fundFill,
        },
        {
          type: "bar",
          direction: "horizontal",
          xKey: "label",
          yKey: "categoryAverage",
          yName: "Category avg",
          fill: peerFill,
        },
      ],
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
          gridStyle: [{ stroke: gridColor, lineDash: [2, 4] }],
        },
      },
    }),
    [metrics, isDark, fundFill, peerFill, labelColor, gridColor]
  );

  return (
    <div className="h-[290px]">
      <AgCharts options={options} />
    </div>
  );
}
