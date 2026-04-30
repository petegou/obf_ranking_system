import { scoreColorVar } from "@/lib/score-color";

export function ScoreBar({
  label,
  value,
  max = 100,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const color = scoreColorVar(value);

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm w-32 shrink-0 capitalize text-[var(--text-secondary)]">
        {label.replace(/_/g, " ")}
      </span>
      <div className="flex-1 h-2 rounded-full overflow-hidden bg-[var(--surface-muted)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="font-mono text-sm w-14 text-right font-medium tabular-nums"
        style={{ color }}
      >
        {value.toFixed(1)}
      </span>
    </div>
  );
}
