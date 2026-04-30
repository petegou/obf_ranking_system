import { getAllFundsForScatter, getOverviewKpis } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function OverviewPlaceholder() {
  const [kpis, scatter] = await Promise.all([
    getOverviewKpis(),
    getAllFundsForScatter(),
  ]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Overview (placeholder)</h1>
      <p className="mt-2 text-sm">{scatter.length} scatter rows loaded</p>
      <pre className="mt-4 text-xs">{JSON.stringify(kpis, null, 2)}</pre>
    </div>
  );
}
