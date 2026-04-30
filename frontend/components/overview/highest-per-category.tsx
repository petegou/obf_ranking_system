import Link from 'next/link';
import type { HighestPerCategoryRow } from '@/lib/queries';
import { scoreColorVar } from '@/lib/score-color';

export function HighestPerCategory({
  rows,
}: {
  rows: HighestPerCategoryRow[];
}) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 h-full flex flex-col min-h-0 overflow-auto">
      <h2 className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">
        Highest-scoring per category
      </h2>
      <p className="shrink-0 mt-0.5 text-xs text-[var(--text-tertiary)]">
        Highest current GPA fund per category. Decision-support reference only.
      </p>
      <ul className="mt-3 flex-1 min-h-0 overflow-y-auto -mr-2 pr-2 divide-y divide-[var(--border-subtle)]">
        {rows.map((row) => {
          const pct = Math.min(100, Math.max(0, row.totalGpaScore));
          const color = scoreColorVar(row.totalGpaScore);

          return (
            <li key={row.category}>
              <Link
                href={`/categories/${encodeURIComponent(row.category)}?fund=${encodeURIComponent(row.ticker)}`}
                className="block py-2 -mx-2 px-2 rounded no-underline hover:bg-[var(--surface-muted)] transition-colors">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-mono text-xs font-medium text-[var(--text-primary)] shrink-0">
                      {row.ticker}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] truncate">
                      {row.category}
                    </span>
                  </div>
                  <span
                    className="font-mono text-xs font-semibold tabular-nums shrink-0"
                    style={{ color }}>
                    {row.totalGpaScore.toFixed(1)}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--text-tertiary)] truncate">
                  {row.name}
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                  <div
                    className="h-full"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
