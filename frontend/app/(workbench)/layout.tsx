import { Providers } from "@/components/providers";
import { AppShell } from "@/components/shell/app-shell";
import { getCategoriesWithCounts, getRankingSnapshots } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function WorkbenchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [snapshots, categories] = await Promise.all([
    getRankingSnapshots(),
    getCategoriesWithCounts(),
  ]);

  return (
    <Providers>
      <AppShell snapshots={snapshots} initialCategories={categories}>
        {children}
      </AppShell>
    </Providers>
  );
}
