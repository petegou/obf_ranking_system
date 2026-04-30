import { HighestPerCategory } from "@/components/overview/highest-per-category";
import { KpiStrip } from "@/components/overview/kpi-strip";
import { RiskReturnScatter } from "@/components/overview/risk-return-scatter";
import {
  getAllFundsForScatter,
  getHighestPerCategory,
  getOverviewKpis,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [kpis, scatter, highest] = await Promise.all([
    getOverviewKpis(),
    getAllFundsForScatter(),
    getHighestPerCategory(),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-0.5 text-sm text-[var(--text-tertiary)]">
          Cross-category snapshot of the current rankings.
        </p>
      </header>
      <KpiStrip kpis={kpis} />
      <RiskReturnScatter rows={scatter} />
      <HighestPerCategory rows={highest} />
    </div>
  );
}
