"use client";

import "@/lib/ag-charts-setup";
import { AgCharts } from "ag-charts-react";
import type { AgCartesianChartOptions } from "ag-charts-community";
import { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
} from "ag-grid-community";
import type { RankingRow } from "@/components/workbench/rankings-grid";
import { useIsDarkMode } from "@/lib/use-color-scheme";
import { SELECTION_COLORS } from "@/lib/selection-colors";
import { formatPercentPointsMetric } from "@/lib/metric-format";

ModuleRegistry.registerModules([AllCommunityModule]);

type EfficiencyView = "3yr" | "5yr";
type EfficiencyPoint = {
  ticker: string;
  name: string;
  efficiencyRisk: number;
  efficiencyReturn: number;
  gov: number | null;
};
type RiskRewardRow = EfficiencyPoint & {
  position: number;
  selectedIndex: number;
};

const TRADING_DAYS_PER_YEAR = 252;

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
  fontSize: 12,
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
  fontSize: 12,
  fontFamily: "inherit",
});

const VIEW_CONFIG = {
  "3yr": {
    label: "3Y",
    years: 3,
    riskKey: "stdDev3yr",
    returnKey: "return3yr",
    xTitle: "3Y Annualized Std Dev",
    yTitle: "3Y Annualized Return",
  },
  "5yr": {
    label: "5Y",
    years: 5,
    riskKey: "stdDev5yr",
    returnKey: "return5yr",
    xTitle: "5Y Annualized Std Dev",
    yTitle: "5Y Annualized Return",
  },
} satisfies Record<
  EfficiencyView,
  {
    label: string;
    years: number;
    riskKey: keyof RankingRow;
    returnKey: keyof RankingRow;
    xTitle: string;
    yTitle: string;
  }
>;

function cumulativeReturnPercent(value: number) {
  if (value === 0) return 0;
  return Math.abs(value) <= 2 ? value * 100 : value;
}

function annualizedReturnPercent(value: number, years: number) {
  const cumulative = cumulativeReturnPercent(value) / 100;
  if (cumulative <= -1) return null;
  return (Math.pow(1 + cumulative, 1 / years) - 1) * 100;
}

function annualizedStdDevPercent(value: number) {
  return value * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100;
}

function buildEfficiencyPoints(
  rows: RankingRow[],
  view: EfficiencyView
): EfficiencyPoint[] {
  const config = VIEW_CONFIG[view];
  return rows.flatMap((row) => {
    const risk = row[config.riskKey];
    const fundReturn = row[config.returnKey];
    if (typeof risk !== "number" || typeof fundReturn !== "number") return [];
    const annualRisk = annualizedStdDevPercent(risk);
    const annualReturn = annualizedReturnPercent(fundReturn, config.years);
    if (annualReturn === null) return [];
    return [{
      ticker: row.ticker,
      name: row.name,
      efficiencyRisk: annualRisk,
      efficiencyReturn: annualReturn,
      gov: annualRisk !== 0 ? annualReturn / annualRisk : null,
    }];
  });
}

function SecurityCell(params: ICellRendererParams<RiskRewardRow>) {
  const point = params.data;
  if (!point) return null;
  const color =
    point.selectedIndex >= 0
      ? SELECTION_COLORS[point.selectedIndex % SELECTION_COLORS.length]
      : "var(--text-tertiary)";

  return (
    <div className="flex h-full min-w-0 items-center gap-2">
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="font-mono font-semibold text-[var(--text-primary)]">
        {point.ticker}
      </span>
      <span className="truncate text-[var(--text-secondary)]">
        {point.name}
      </span>
    </div>
  );
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
          data: [
            {
              label: "Annualized Std Dev",
              value: formatPercentPointsMetric(datum.efficiencyRisk),
            },
            {
              label: "Annualized Return",
              value: formatPercentPointsMetric(datum.efficiencyReturn),
            },
            {
              label: "GOV",
              value: datum.gov === null ? "-" : datum.gov.toFixed(2),
            },
          ],
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
              data: [
                {
                  label: "Annualized Std Dev",
                  value: formatPercentPointsMetric(datum.efficiencyRisk),
                },
                {
                  label: "Annualized Return",
                  value: formatPercentPointsMetric(datum.efficiencyReturn),
                },
                {
                  label: "GOV",
                  value: datum.gov === null ? "-" : datum.gov.toFixed(2),
                },
              ],
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
          gridLine: { style: [{ stroke: gridColor, lineDash: [2, 4] }] },
        },
        y: {
          type: "number",
          position: "left",
          title: { text: viewConfig.yTitle, color: labelColor },
          label: { color: labelColor, fontSize: 11 },
          gridLine: { style: [{ stroke: gridColor, lineDash: [2, 4] }] },
        },
      },
    };
  }, [points, selectedTickers, selectedSet, isDark, labelColor, gridColor, bgDot, bgDotStroke, selectedStroke, viewConfig]);

  const tableRows = useMemo<RiskRewardRow[]>(
    () => {
      const sorted = [...points].sort((a, b) => {
        const leftSelected = selectedSet.has(a.ticker);
        const rightSelected = selectedSet.has(b.ticker);
        if (leftSelected !== rightSelected) return leftSelected ? -1 : 1;
        return b.efficiencyReturn - a.efficiencyReturn;
      });

      return sorted.map((point, index) => ({
        ...point,
        position: index + 1,
        selectedIndex: selectedTickers.indexOf(point.ticker),
      }));
    },
    [points, selectedSet, selectedTickers]
  );

  const tableColumns = useMemo<ColDef<RiskRewardRow>[]>(
    () => [
      {
        headerName: "#",
        field: "position",
        width: 64,
        pinned: "left",
        lockPinned: true,
        suppressMovable: true,
        cellClass: "text-[var(--text-tertiary)]",
      },
      {
        headerName: "Security",
        field: "ticker",
        flex: 1,
        minWidth: 260,
        cellRenderer: SecurityCell,
        sortable: true,
      },
      {
        headerName: `${viewConfig.label} Std Dev`,
        field: "efficiencyRisk",
        width: 130,
        pinned: "right",
        lockPinned: true,
        suppressMovable: true,
        valueFormatter: ({ value }) =>
          typeof value === "number" ? formatPercentPointsMetric(value) : "",
        cellClass: "font-mono tabular-nums",
        type: "rightAligned",
      },
      {
        headerName: `${viewConfig.label} Return`,
        field: "efficiencyReturn",
        width: 130,
        pinned: "right",
        lockPinned: true,
        suppressMovable: true,
        valueFormatter: ({ value }) =>
          typeof value === "number" ? formatPercentPointsMetric(value) : "",
        cellClass: "font-mono tabular-nums",
        type: "rightAligned",
      },
      {
        headerName: "GOV",
        field: "gov",
        width: 105,
        pinned: "right",
        lockPinned: true,
        suppressMovable: true,
        valueFormatter: ({ value }) =>
          typeof value === "number" ? value.toFixed(2) : "-",
        cellClass: "font-mono tabular-nums",
        type: "rightAligned",
      },
    ],
    [viewConfig.label]
  );

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
      <div className="mt-4 h-72 overflow-hidden rounded-lg border border-[var(--border-subtle)]">
        <AgGridReact<RiskRewardRow>
          theme={isDark ? gridThemeDark : gridThemeLight}
          rowData={tableRows}
          columnDefs={tableColumns}
          defaultColDef={{
            sortable: true,
            resizable: true,
          }}
          getRowId={(params) => params.data.ticker}
          rowClassRules={{
            "bg-[var(--surface-muted)]": (params) =>
              (params.data?.selectedIndex ?? -1) >= 0,
          }}
          suppressCellFocus
          animateRows
        />
      </div>
    </div>
  );
}
