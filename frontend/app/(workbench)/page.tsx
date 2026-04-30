import { KpiStrip } from "@/components/overview/kpi-strip";
import { getOverviewKpis } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const kpis = await getOverviewKpis();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-0.5 text-sm text-[var(--text-tertiary)]">
          Cross-category snapshot of the current rankings.
        </p>
      </header>
      <KpiStrip kpis={kpis} />
    </div>
  );
}
