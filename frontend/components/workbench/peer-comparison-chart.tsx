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
  const peerFill = isDark ? "#525252" : "#a3a3a3";
  const labelColor = isDark ? "#a3a3a3" : "#737373";

  const options = useMemo<AgCartesianChartOptions>(
    () => ({
      theme: isDark ? "ag-default-dark" : "ag-default",
      data: metrics,
      background: { fill: "transparent" },
      legend: {
        position: "bottom",
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
    }),
    [metrics, isDark, fundFill, peerFill, labelColor]
  );

  return (
    <div className="h-[260px]">
      <AgCharts options={options} />
    </div>
  );
}
