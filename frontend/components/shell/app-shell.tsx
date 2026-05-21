import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

export interface CategoryNavItem {
  category: string;
  count: number;
  level_1: string | null;
  level_2: string | null;
  level_3: string | null;
  level_4: string | null;
}

export function AppShell({
  categories,
  children,
}: {
  categories: CategoryNavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex bg-[var(--surface-base)] overflow-hidden">
      <Sidebar categories={categories} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <TopBar />
        <main className="flex-1 min-w-0 min-h-0 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
