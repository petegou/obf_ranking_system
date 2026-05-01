import type { OverviewScoreDistribution } from "@/lib/queries";

const BAND_COLORS: Record<string, string> = {
  "80+": "var(--score-strong)",
  "70-79": "var(--score-strong)",
  "60-69": "var(--score-moderate)",
  "<60": "var(--score-weak)",
};

export function ScoreDistribution({
  rows,
}: {
  rows: OverviewScoreDistribution[];
}) {
  const maxCount = Math.max(...rows.map((row) => row.count), 1);

  return (
    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          GPA distribution
        </h2>
        <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
          Current rankings grouped by decision-support score bands.
        </p>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => {
          const color = BAND_COLORS[row.label] ?? "var(--text-secondary)";
          const width = maxCount > 0 ? (row.count / maxCount) * 100 : 0;

          return (
            <div key={row.label} className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  {row.label}
                </span>
                <span className="font-mono text-xs tabular-nums text-[var(--text-tertiary)]">
                  {row.percent.toFixed(0)}%
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                  {row.count.toLocaleString()}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  funds
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-[var(--surface-muted)]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${width}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="py-8 text-center text-sm text-[var(--text-tertiary)] sm:col-span-2 lg:col-span-4">
            No current rankings available.
          </div>
        )}
      </div>
    </section>
  );
}
