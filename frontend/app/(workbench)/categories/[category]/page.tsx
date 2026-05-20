import { Suspense } from "react";
import { FundDetailDock } from "@/components/workbench/fund-detail-dock";
import { FundDetailPanel } from "@/components/workbench/fund-detail-panel";
import { PanelMotion } from "@/components/workbench/panel-motion";
import { RankingsGrid, type RankingRow } from "@/components/workbench/rankings-grid";
import { getRankingsForCategory } from "@/lib/queries";
import { numOrNull } from "@/lib/rankings-utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ fund?: string | string[] }>;
}

export default async function CategoryWorkbenchPage({
  params,
  searchParams,
}: PageProps) {
  const { category: rawCategory } = await params;
  const { fund } = await searchParams;
  const category = decodeURIComponent(rawCategory);
  const result = await getRankingsForCategory(category);

  const rows: RankingRow[] = result.rankings.map((ranking) => ({
    rank: ranking.rank,
    ticker: ranking.ticker,
    name: ranking.name,
    totalGpaScore: ranking.total_gpa_score,
    riskScore: ranking.risk_score,
    returnScore: ranking.return_score,
    marketCapScore: ranking.market_cap_score,
    turnoverScore: ranking.turnover_score,
    betaScore: ranking.risk_breakdown.beta,
    rSquaredScore: ranking.risk_breakdown.r_squared,
    upCaptureScore: ranking.risk_breakdown.up_capture,
    downCaptureScore: ranking.risk_breakdown.down_capture,
    sharpeScore: ranking.risk_breakdown.sharpe,
    trackingErrorScore: ranking.risk_breakdown.tracking_error,
    sortinoScore: ranking.risk_breakdown.sortino,
    treynorScore: ranking.risk_breakdown.treynor,
    infoRatioScore: ranking.risk_breakdown.info_ratio,
    kurtosisScore: ranking.risk_breakdown.kurtosis,
    drawdownScore: ranking.risk_breakdown.drawdown,
    skewnessScore: ranking.risk_breakdown.skewness,
    alphaScore: ranking.return_breakdown.alpha,
    yieldScore: ranking.return_breakdown.yield,
    relativeReturnScore: ranking.return_breakdown.relative_return,
    priceScore: ranking.return_breakdown.price,
    feeScore: ranking.return_breakdown.fee,
    aum: numOrNull(ranking.metrics.aum),
    turnover: numOrNull(ranking.metrics.turnover),
    lastPrice: numOrNull(ranking.metrics.last_price),
    expenseRatio: numOrNull(ranking.metrics.expense_ratio),
    yieldPct: numOrNull(ranking.metrics.yield_pct),
    pe: numOrNull(ranking.metrics.pe),
    pb: numOrNull(ranking.metrics.pb),
    minInitialInvestment: numOrNull(ranking.metrics.min_initial_investment),
    alpha3yr: numOrNull(ranking.metrics.alpha_3yr),
    alpha5yr: numOrNull(ranking.metrics.alpha_5yr),
    returnQtd: numOrNull(ranking.metrics.return_qtd),
    returnYtd: numOrNull(ranking.metrics.return_ytd),
    return1yr: numOrNull(ranking.metrics.return_1yr),
    return3yr: numOrNull(ranking.metrics.return_3yr),
    return5yr: numOrNull(ranking.metrics.return_5yr),
    return10yr: numOrNull(ranking.metrics.return_10yr),
    benchmarkReturn1yr: numOrNull(ranking.metrics.benchmark_return_1yr),
    benchmarkReturn3yr: numOrNull(ranking.metrics.benchmark_return_3yr),
    benchmarkReturn5yr: numOrNull(ranking.metrics.benchmark_return_5yr),
    benchmarkReturn10yr: numOrNull(ranking.metrics.benchmark_return_10yr),
    battingAvg3yr: numOrNull(ranking.metrics.batting_avg_3yr),
    battingAvg5yr: numOrNull(ranking.metrics.batting_avg_5yr),
    beta3yr: numOrNull(ranking.metrics.beta_3yr),
    beta5yr: numOrNull(ranking.metrics.beta_5yr),
    rSquared3yr: numOrNull(ranking.metrics.r_squared_3yr),
    rSquared5yr: numOrNull(ranking.metrics.r_squared_5yr),
    upCapture3yr: numOrNull(ranking.metrics.up_capture_3yr),
    upCapture5yr: numOrNull(ranking.metrics.up_capture_5yr),
    downCapture3yr: numOrNull(ranking.metrics.down_capture_3yr),
    downCapture5yr: numOrNull(ranking.metrics.down_capture_5yr),
    sharpe3yr: numOrNull(ranking.metrics.sharpe_3yr),
    sharpe5yr: numOrNull(ranking.metrics.sharpe_5yr),
    trackingError3yr: numOrNull(ranking.metrics.tracking_error_3yr),
    trackingError5yr: numOrNull(ranking.metrics.tracking_error_5yr),
    sortino3yr: numOrNull(ranking.metrics.sortino_3yr),
    sortino5yr: numOrNull(ranking.metrics.sortino_5yr),
    treynor3yr: numOrNull(ranking.metrics.treynor_3yr),
    treynor5yr: numOrNull(ranking.metrics.treynor_5yr),
    infoRatio3yr: numOrNull(ranking.metrics.info_ratio_3yr),
    infoRatio5yr: numOrNull(ranking.metrics.info_ratio_5yr),
    kurtosis3yr: numOrNull(ranking.metrics.kurtosis_3yr),
    kurtosis5yr: numOrNull(ranking.metrics.kurtosis_5yr),
    drawdown3yr: numOrNull(ranking.metrics.drawdown_3yr),
    drawdown5yr: numOrNull(ranking.metrics.drawdown_5yr),
    skewness3yr: numOrNull(ranking.metrics.skewness_3yr),
    skewness5yr: numOrNull(ranking.metrics.skewness_5yr),
    stdDev3yr: numOrNull(ranking.metrics.std_dev_3yr),
    stdDev5yr: numOrNull(ranking.metrics.std_dev_5yr),
    downsideDev3yr: numOrNull(ranking.metrics.downside_dev_3yr),
    downsideDev5yr: numOrNull(ranking.metrics.downside_dev_5yr),
  }));

  const selectedTickers: string[] = fund
    ? Array.isArray(fund) ? fund : [fund]
    : [];

  const panelKey = [...selectedTickers].sort().join(",");
  const columnControlsId = `category-column-controls-${encodeURIComponent(category)}`;

  return (
    <div className="h-full flex">
      <section className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]">
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight">{category}</h1>
            <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
              {rows.length} funds ranked by Oak Bridge multi-factor GPA -
              decision support only.
            </p>
          </div>
          <div
            id={columnControlsId}
            className="relative z-20 flex shrink-0 justify-end"
          />
        </header>
        <div className="flex-1 min-h-0">
          <RankingsGrid
            rows={rows}
            category={category}
            columnControlsId={columnControlsId}
          />
        </div>
      </section>
      <FundDetailDock selectedTickers={selectedTickers}>
        <Suspense
          key={panelKey}
          fallback={<div className="p-4 flex-1 min-h-0 text-xs">Loading...</div>}
        >
          <PanelMotion key={panelKey}>
            <FundDetailPanel tickers={selectedTickers} rows={rows} />
          </PanelMotion>
        </Suspense>
      </FundDetailDock>
    </div>
  );
}
