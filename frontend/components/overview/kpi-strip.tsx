import type { OverviewKpis } from "@/lib/queries";
import { Card } from "@/components/ui/card";

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
}

function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <Card className="p-4 border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-none">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">
        {label}
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-xs text-[var(--text-tertiary)]">{hint}</div>
      )}
    </Card>
  );
}

function formatAsOfDate(value: string | null): string {
  if (!value) return "No snapshot";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${month}/${day}/${year}`;
}

export function KpiStrip({ kpis }: { kpis: OverviewKpis }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <KpiCard label="Total Funds" value={kpis.totalFunds.toLocaleString()} />
      <KpiCard label="Categories" value={kpis.categoryCount.toString()} />
      <KpiCard
        label="Avg GPA Score"
        value={kpis.avgGpaScore.toFixed(1)}
        hint="of 100"
      />
      <KpiCard
        label="Scoring 70+"
        value={`${kpis.pctScoringSeventyOrAbove.toFixed(0)}%`}
      />
      <KpiCard label="As Of" value={formatAsOfDate(kpis.asOfDate)} />
    </div>
  );
}
