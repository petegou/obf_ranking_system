import Link from "next/link";
import type { HighestPerCategoryRow } from "@/lib/queries";
import { scoreColorVar } from "@/lib/score-color";

export function HighestPerCategory({
  rows,
}: {
  rows: HighestPerCategoryRow[];
}) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Highest-scoring per category
      </h2>
      <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
        Highest current GPA fund per category. Decision-support reference only.
      </p>
      <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
        {rows.map((row) => {
          const pct = Math.min(100, Math.max(0, row.totalGpaScore));
          const color = scoreColorVar(row.totalGpaScore);

          return (
            <li key={row.category}>
              <Link
                href={`/categories/${encodeURIComponent(row.category)}?fund=${encodeURIComponent(row.ticker)}`}
                className="flex items-center gap-3 py-2 no-underline hover:bg-[var(--surface-muted)] -mx-2 px-2 rounded transition-colors"
              >
                <div className="w-32 text-xs text-[var(--text-secondary)] truncate">
                  {row.category}
                </div>
                <div className="font-mono text-xs text-[var(--text-primary)] w-16">
                  {row.ticker}
                </div>
                <div className="flex-1 min-w-0 text-xs text-[var(--text-tertiary)] truncate">
                  {row.name}
                </div>
                <div className="w-32 h-1.5 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                  <div
                    className="h-full"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
                <div
                  className="font-mono text-xs font-semibold tabular-nums w-12 text-right"
                  style={{ color }}
                >
                  {row.totalGpaScore.toFixed(1)}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
