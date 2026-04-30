import { getOverviewKpis } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function OverviewPlaceholder() {
  const kpis = await getOverviewKpis();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Overview (placeholder)</h1>
      <pre className="mt-4 text-xs">{JSON.stringify(kpis, null, 2)}</pre>
    </div>
  );
}
