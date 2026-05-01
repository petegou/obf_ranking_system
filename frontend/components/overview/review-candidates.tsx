import Link from "next/link";
import type { OverviewReviewCandidate } from "@/lib/queries";
import { scoreColorVar } from "@/lib/score-color";

export function ReviewCandidates({
  rows,
}: {
  rows: OverviewReviewCandidate[];
}) {
  return (
    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Review candidates
        </h2>
        <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
          Funds with score profiles that may deserve a closer look.
        </p>
      </div>
      <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
        {rows.map((row) => {
          const href = `/categories/${encodeURIComponent(
            row.category
          )}?fund=${encodeURIComponent(row.ticker)}`;
          const color = scoreColorVar(row.totalGpaScore);

          return (
            <li key={`${row.reasonLabel}-${row.ticker}`}>
              <Link
                href={href}
                className="-mx-2 block rounded px-2 py-2.5 no-underline transition-colors hover:bg-[var(--surface-muted)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                        {row.ticker}
                      </span>
                      <span className="truncate text-xs text-[var(--text-secondary)]">
                        {row.category}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-[var(--text-tertiary)]">
                      {row.name}
                    </div>
                  </div>
                  <span
                    className="font-mono text-xs font-semibold tabular-nums"
                    style={{ color }}
                  >
                    {row.totalGpaScore.toFixed(1)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded border border-[var(--border-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                    {row.reasonLabel}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                    R {row.riskScore.toFixed(0)}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                    Ret {row.returnScore.toFixed(0)}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                    Cap {row.marketCapScore.toFixed(0)}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                    Turn {row.turnoverScore.toFixed(0)}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
        {rows.length === 0 && (
          <li className="py-8 text-center text-sm text-[var(--text-tertiary)]">
            No review candidates available.
          </li>
        )}
      </ul>
    </section>
  );
}
