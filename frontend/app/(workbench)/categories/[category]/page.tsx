import { Suspense } from "react";
import { EmptyDetail } from "@/components/workbench/empty-detail";
import { FundDetailPanel } from "@/components/workbench/fund-detail-panel";
import { PanelMotion } from "@/components/workbench/panel-motion";
import { RankingsGrid, type RankingRow } from "@/components/workbench/rankings-grid";
import { getRankingsForCategory } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ fund?: string }>;
}

export default async function CategoryWorkbenchPage({
  params,
  searchParams,
}: PageProps) {
  const { category: rawCategory } = await params;
  const { fund: selectedFund } = await searchParams;
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
  }));

  return (
    <div className="h-[calc(100vh-2.75rem)] flex">
      <section className="flex-1 min-w-0 flex flex-col">
        <header className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]">
          <h1 className="text-base font-semibold tracking-tight">{category}</h1>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            {rows.length} funds ranked by Oak Bridge multi-factor GPA -
            decision support only.
          </p>
        </header>
        <div className="flex-1 min-h-0">
          <RankingsGrid rows={rows} category={category} />
        </div>
      </section>
      <aside className="w-80 shrink-0 border-l border-[var(--border-subtle)] bg-[var(--surface-card)]">
        {selectedFund ? (
          <Suspense
            key={selectedFund}
            fallback={<div className="p-4 text-xs">Loading...</div>}
          >
            <PanelMotion key={selectedFund}>
              <FundDetailPanel ticker={selectedFund} />
            </PanelMotion>
          </Suspense>
        ) : (
          <EmptyDetail />
        )}
      </aside>
    </div>
  );
}
