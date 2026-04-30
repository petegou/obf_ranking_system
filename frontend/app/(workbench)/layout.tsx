import { Providers } from "@/components/providers";
import { AppShell } from "@/components/shell/app-shell";
import { getCategoriesWithCounts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function WorkbenchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getCategoriesWithCounts();

  return (
    <Providers>
      <AppShell categories={categories}>{children}</AppShell>
    </Providers>
  );
}
