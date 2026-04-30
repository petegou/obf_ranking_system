"use client";

import type { CategoryNavItem } from "./app-shell";

export function Sidebar({ categories }: { categories: CategoryNavItem[] }) {
  return (
    <aside className="w-60 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
      <div className="text-sm font-semibold text-[var(--text-primary)]">
        Oak Bridge
      </div>
      <ul className="mt-4 space-y-1 text-xs text-[var(--text-tertiary)]">
        {categories.map((c) => (
          <li key={c.category}>
            {c.category} ({c.count})
          </li>
        ))}
      </ul>
    </aside>
  );
}
