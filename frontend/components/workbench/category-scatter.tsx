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
import styles from "./category-scatter.module.css";

ModuleRegistry.registerModules([AllCommunityModule]);

type EfficiencyView = "3yr" | "5yr";
type EfficiencyPoint = {
  ticker: string;
  name: string;
  displayName: string;
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
  return value * 100;
}

function annualizedReturnPercent(value: number, years: number) {
  const cumulative = cumulativeReturnPercent(value) / 100;
  if (cumulative <= -1) return null;
  return (Math.pow(1 + cumulative, 1 / years) - 1) * 100;
}

function annualizedStdDevPercent(value: number) {
  return value * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[midpoint]
    : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

function securityLabel(ticker: string, name: string) {
  return name ? `${ticker} - ${name}` : ticker;
}

function escapeTooltipHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character
  );
}

function renderEfficiencyTooltip(
  datum: EfficiencyPoint,
  markerColor: string,
  periodLabel: string
) {
  const name = datum.name
    ? `<div class="${styles.name}">${escapeTooltipHtml(datum.name)}</div>`
    : "";
  const risk = formatPercentPointsMetric(datum.efficiencyRisk);
  const fundReturn = formatPercentPointsMetric(datum.efficiencyReturn);
  const gov = datum.gov === null ? "-" : datum.gov.toFixed(2);

  return `
    <div class="${styles.tooltip}">
      <div class="${styles.header}">
        <div class="${styles.identity}">
          <span class="${styles.swatch}" style="background-color: ${markerColor}"></span>
          <div class="${styles.security}">
            <div class="${styles.ticker}">${escapeTooltipHtml(datum.ticker)}</div>
            ${name}
          </div>
        </div>
        <span class="${styles.period}">${escapeTooltipHtml(periodLabel)}</span>
      </div>
      <div class="${styles.metrics}">
        <div class="${styles.metric}">
          <span class="${styles.metricLabel}">Risk</span>
          <span class="${styles.metricValue}">${risk}</span>
          <span class="${styles.metricNote}">Std dev</span>
        </div>
        <div class="${styles.metric}">
          <span class="${styles.metricLabel}">Return</span>
          <span class="${styles.metricValue}">${fundReturn}</span>
          <span class="${styles.metricNote}">Annualized</span>
        </div>
        <div class="${styles.metric}">
          <span class="${styles.metricLabel}">GOV</span>
          <span class="${styles.metricValue}">${gov}</span>
          <span class="${styles.metricNote}">Return / risk</span>
        </div>
      </div>
    </div>
  `;
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
      displayName: securityLabel(row.ticker, row.name),
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
      {point.name ? (
        <span className="text-[var(--text-tertiary)]">-</span>
      ) : null}
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
  const [showCategoryPeers, setShowCategoryPeers] = useState(true);
  const viewConfig = VIEW_CONFIG[view];
  const labelColor = isDark ? "#a3a3a3" : "#737373";
  const gridColor = isDark ? "#374151" : "#d4d4d4";
  const bgDot = isDark ? "#9ca3af" : "#525252";
  const bgDotStroke = isDark ? "#d1d5db" : "#171717";
  const selectedStroke = isDark ? "#dbeafe" : "#0f172a";
  const medianColor = isDark ? "#64748b" : "#a3a3a3";

  const selectedSet = useMemo(
    () => new Set(selectedTickers),
    [selectedTickers]
  );

  const points = useMemo(() => buildEfficiencyPoints(rows, view), [rows, view]);
  const selectedPoints = useMemo(
    () =>
      selectedTickers
        .map((ticker) => points.find((point) => point.ticker === ticker))
        .filter((point): point is EfficiencyPoint => Boolean(point)),
    [points, selectedTickers]
  );
  const categoryMedianRisk = useMemo(
    () => median(points.map((point) => point.efficiencyRisk)),
    [points]
  );
  const categoryMedianReturn = useMemo(
    () => median(points.map((point) => point.efficiencyReturn)),
    [points]
  );

  const options = useMemo<AgCartesianChartOptions>(() => {
    const byTicker = new Map<string, EfficiencyPoint[]>();
    const backgroundData: EfficiencyPoint[] = [];
    for (const point of points) {
      if (selectedSet.has(point.ticker)) {
        const bucket = byTicker.get(point.ticker) ?? [];
        bucket.push(point);
        byTicker.set(point.ticker, bucket);
      } else if (showCategoryPeers) {
        backgroundData.push(point);
      }
    }

    const selectedSeries = selectedTickers.map((ticker, i) => {
      const data = byTicker.get(ticker) ?? [];
      return {
        type: "scatter" as const,
        data,
        xKey: "efficiencyRisk",
        yKey: "efficiencyReturn",
        title: data[0]?.displayName ?? ticker,
        fill: SELECTION_COLORS[i % SELECTION_COLORS.length],
        size: 11,
        stroke: selectedStroke,
        strokeWidth: 1.5,
        tooltip: {
          renderer: ({ datum }: { datum: EfficiencyPoint }) =>
            renderEfficiencyTooltip(
              datum,
              SELECTION_COLORS[i % SELECTION_COLORS.length],
              viewConfig.label
            ),
        },
      };
    });

    return {
      theme: isDark ? "ag-default-dark" : "ag-default",
      background: { fill: "transparent" },
      padding: { top: 8, right: 8, bottom: 0, left: 0 },
      legend: {
        enabled: false,
      },
      series: [
        ...(showCategoryPeers
          ? [
              {
                type: "scatter" as const,
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
                  renderer: ({ datum }: { datum: EfficiencyPoint }) =>
                    renderEfficiencyTooltip(datum, bgDot, viewConfig.label),
                },
              },
            ]
          : []),
        ...selectedSeries,
      ],
      axes: {
        x: {
          type: "number",
          position: "bottom",
          title: { text: viewConfig.xTitle, color: labelColor },
          label: { color: labelColor, fontSize: 11 },
          gridLine: { style: [{ stroke: gridColor, lineDash: [2, 4] }] },
          crossLines:
            categoryMedianRisk === null
              ? []
              : [
                  {
                    type: "line",
                    value: categoryMedianRisk,
                    stroke: medianColor,
                    strokeOpacity: 0.75,
                    lineDash: [5, 4],
                    label: {
                      text: "Median risk",
                      position: "top-right",
                      color: labelColor,
                      fontSize: 10,
                    },
                  },
                ],
        },
        y: {
          type: "number",
          position: "left",
          title: { text: viewConfig.yTitle, color: labelColor },
          label: { color: labelColor, fontSize: 11 },
          gridLine: { style: [{ stroke: gridColor, lineDash: [2, 4] }] },
          crossLines:
            categoryMedianReturn === null
              ? []
              : [
                  {
                    type: "line",
                    value: categoryMedianReturn,
                    stroke: medianColor,
                    strokeOpacity: 0.75,
                    lineDash: [5, 4],
                    label: {
                      text: "Median return",
                      position: "top-left",
                      color: labelColor,
                      fontSize: 10,
                    },
                  },
                ],
        },
      },
    };
  }, [
    points,
    selectedTickers,
    selectedSet,
    showCategoryPeers,
    isDark,
    labelColor,
    gridColor,
    bgDot,
    bgDotStroke,
    selectedStroke,
    medianColor,
    categoryMedianRisk,
    categoryMedianReturn,
    viewConfig,
  ]);

  const tableRows = useMemo<RiskRewardRow[]>(
    () => {
      const ranked = [...points]
        .sort((a, b) => b.efficiencyReturn - a.efficiencyReturn)
        .map((point, index) => ({
          ...point,
          position: index + 1,
          selectedIndex: selectedTickers.indexOf(point.ticker),
        }));

      return ranked.sort((a, b) => {
        const leftSelected = selectedSet.has(a.ticker);
        const rightSelected = selectedSet.has(b.ticker);
        if (leftSelected !== rightSelected) return leftSelected ? -1 : 1;
        if (leftSelected && rightSelected) {
          return a.selectedIndex - b.selectedIndex;
        }
        return a.position - b.position;
      });
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
        headerTooltip: "Annualized return divided by annualized standard deviation",
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
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase text-[var(--text-tertiary)]">
          Annualized period
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={showCategoryPeers}
            onClick={() => setShowCategoryPeers((current) => !current)}
            className={`inline-flex h-8 items-center gap-2 rounded-md border bg-[var(--surface-muted)] px-2.5 text-[10px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-card)] ${
              showCategoryPeers
                ? "border-[var(--border-default)] text-[var(--text-primary)]"
                : "border-[var(--border-subtle)] text-[var(--text-tertiary)]"
            }`}
          >
            <span
              className={`size-2 rounded-full bg-[var(--text-tertiary)] transition-opacity ${
                showCategoryPeers ? "opacity-70" : "opacity-30"
              }`}
            />
            <span>Category peers</span>
            <span
              aria-hidden="true"
              className={`relative inline-flex h-3.5 w-6 shrink-0 rounded-full border transition-colors ${
                showCategoryPeers
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]"
                  : "border-[var(--border-default)] bg-[var(--surface-card)]"
              }`}
            >
              <span
                className={`block size-2.5 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform ${
                  showCategoryPeers ? "translate-x-3" : "translate-x-0.5"
                }`}
              />
            </span>
          </button>
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
      </div>
      <div className="mb-2 flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--text-secondary)]">
        {selectedPoints.slice(0, 4).map((point) => (
          <span key={point.ticker} className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{
                backgroundColor:
                  SELECTION_COLORS[
                    selectedTickers.indexOf(point.ticker) % SELECTION_COLORS.length
                  ],
              }}
            />
            <span className="font-mono font-semibold">{point.ticker}</span>
          </span>
        ))}
        {selectedPoints.length > 4 ? (
          <span className="font-mono text-[var(--text-tertiary)]">
            +{selectedPoints.length - 4} more
          </span>
        ) : null}
      </div>
      <div className="h-[300px]">
        <AgCharts options={options} />
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <div className="text-xs font-semibold text-[var(--text-secondary)]">
          Category peers
        </div>
        <div className="text-[10px] text-[var(--text-tertiary)]">
          Selected funds pinned · ranked by {viewConfig.label} return
        </div>
      </div>
      <div className="mt-2 h-72 overflow-hidden rounded-md border border-[var(--border-subtle)]">
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
