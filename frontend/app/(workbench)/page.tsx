import { CategoryOpportunityTable } from '@/components/overview/category-opportunity-table';
import { KpiStrip } from '@/components/overview/kpi-strip';
import { ReviewCandidates } from '@/components/overview/review-candidates';
import { ScoreDistribution } from '@/components/overview/score-distribution';
import { getOverviewPageData } from '@/lib/queries';
import { snapshotDateFromSearchParams } from '@/lib/snapshot-date';

export const dynamic = 'force-dynamic';

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const asOfDate = snapshotDateFromSearchParams(await searchParams);
  const { kpis, dashboard } = await getOverviewPageData(asOfDate);

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-0.5 text-sm text-[var(--text-tertiary)]">
          Decision dashboard for the current rankings snapshot.
        </p>
      </header>
      <KpiStrip kpis={kpis} />
      <ScoreDistribution rows={dashboard.distribution} />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <CategoryOpportunityTable
            rows={dashboard.categories}
            selectedDate={asOfDate}
          />
        </div>
        <div className="xl:col-span-2">
          <ReviewCandidates rows={dashboard.candidates} selectedDate={asOfDate} />
        </div>
      </div>
    </div>
  );
}
