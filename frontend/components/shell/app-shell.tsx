import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

export interface CategoryNavItem {
  category: string;
  count: number;
}

export function AppShell({
  categories,
  children,
}: {
  categories: CategoryNavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-[var(--surface-base)]">
      <Sidebar categories={categories} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
