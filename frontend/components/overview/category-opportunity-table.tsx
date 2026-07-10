import Link from "next/link";
import type { OverviewCategorySummary } from "@/lib/queries";
import { scoreColorVar } from "@/lib/score-color";

export function CategoryOpportunityTable({
  rows,
  selectedDate,
}: {
  rows: OverviewCategorySummary[];
  selectedDate: string | null;
}) {
  return (
    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Category opportunity
        </h2>
        <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
          Sorted by average GPA, with category leaders folded into each row.
        </p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              <th className="pb-2 pr-4 font-medium">Category</th>
              <th className="pb-2 pr-4 text-right font-medium">Funds</th>
              <th className="pb-2 pr-4 text-right font-medium">Avg GPA</th>
              <th className="pb-2 pr-4 text-right font-medium">Median</th>
              <th className="pb-2 pr-4 text-right font-medium">High</th>
              <th className="pb-2 pr-4 text-right font-medium">70+</th>
              <th className="pb-2 pr-4 text-right font-medium">Spread</th>
              <th className="pb-2 font-medium">Leader</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {rows.map((row) => {
              const categoryParams = new URLSearchParams();
              if (selectedDate) categoryParams.set("date", selectedDate);
              const categoryQuery = categoryParams.toString();
              const categoryHref = `/categories/${encodeURIComponent(row.category)}${
                categoryQuery ? `?${categoryQuery}` : ""
              }`;
              const leaderParams = new URLSearchParams(categoryParams);
              leaderParams.set("fund", row.leaderTicker);
              const leaderHref = `/categories/${encodeURIComponent(row.category)}?${leaderParams.toString()}`;
              const highColor = scoreColorVar(row.maxGpaScore);

              return (
                <tr key={row.category} className="align-middle">
                  <td className="py-2.5 pr-4">
                    <Link
                      href={categoryHref}
                      className="font-medium text-[var(--text-primary)] no-underline hover:text-[var(--brand-primary)]"
                    >
                      {row.category}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {row.fundCount.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-[var(--text-primary)]">
                    {row.avgGpaScore.toFixed(1)}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {row.medianGpaScore.toFixed(1)}
                  </td>
                  <td
                    className="py-2.5 pr-4 text-right font-mono font-semibold tabular-nums"
                    style={{ color: highColor }}
                  >
                    {row.maxGpaScore.toFixed(1)}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {row.scoringSeventyOrAbove.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {row.scoreSpread.toFixed(1)}
                  </td>
                  <td className="py-2.5">
                    <Link
                      href={leaderHref}
                      className="block min-w-0 no-underline hover:text-[var(--brand-primary)]"
                    >
                      <span className="font-mono text-[var(--text-primary)]">
                        {row.leaderTicker}
                      </span>
                      <span className="ml-2 text-[var(--text-tertiary)]">
                        {row.leaderName}
                      </span>
                    </Link>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="py-8 text-center text-sm text-[var(--text-tertiary)]"
                >
                  No current rankings available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
