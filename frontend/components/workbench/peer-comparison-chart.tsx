"use client";

import { AgCharts } from "ag-charts-react";
import type { AgCartesianChartOptions } from "ag-charts-community";
import { useMemo } from "react";
import type { PeerMetric } from "@/lib/queries";

export function PeerComparisonChart({ metrics }: { metrics: PeerMetric[] }) {
  const options = useMemo<AgCartesianChartOptions>(
    () => ({
      data: metrics,
      background: { fill: "transparent" },
      legend: { position: "bottom" },
      series: [
        {
          type: "bar",
          direction: "horizontal",
          xKey: "label",
          yKey: "fundValue",
          yName: "This fund",
          fill: "#0d1f33",
        },
        {
          type: "bar",
          direction: "horizontal",
          xKey: "label",
          yKey: "categoryAverage",
          yName: "Category avg",
          fill: "#a3a3a3",
        },
      ],
      axes: {
        x: { type: "category", position: "left" },
        y: { type: "number", position: "bottom", min: 0, max: 100 },
      },
    }),
    [metrics]
  );

  return (
    <div className="h-[260px]">
      <AgCharts options={options} />
    </div>
  );
}
