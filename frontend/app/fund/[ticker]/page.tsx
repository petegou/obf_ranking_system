import Link from "next/link";
import { getFundDetail } from "@/lib/queries";
import { scoreColorVar } from "@/lib/score-color";

export const dynamic = "force-dynamic";

function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const barColor = scoreColorVar(value);

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span
        className="text-sm w-32 shrink-0 capitalize"
        style={{ color: "var(--text-muted)" }}
      >
        {label.replace(/_/g, " ")}
      </span>
      <div
        className="flex-1 h-5 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--accent-muted)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="text-sm font-mono w-14 text-right font-medium">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export default async function FundDetailPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const fund = await getFundDetail(ticker);

  if (!fund) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <Link
          href="/"
          className="text-sm font-medium no-underline hover:underline"
          style={{ color: "var(--accent)" }}
        >
          &larr; All Categories
        </Link>
        <div
          className="text-center py-16 mt-6 rounded-lg border"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
            color: "var(--text-muted)",
          }}
        >
          <p className="text-lg">Fund &ldquo;{ticker}&rdquo; not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/rankings/${encodeURIComponent(fund.category)}`}
          className="text-sm font-medium no-underline hover:underline"
          style={{ color: "var(--accent)" }}
        >
          &larr; {fund.category}
        </Link>
      </div>

      {/* Header */}
      <div
        className="rounded-lg border p-6 mb-6"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
              {fund.ticker}
            </h1>
            <p style={{ color: "var(--text-muted)" }}>{fund.name}</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {fund.category} &middot; Rank #{fund.rank}
            </p>
          </div>
          <div className="text-center sm:text-right">
            <div className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              Total GPA Score
            </div>
            <div
              className="text-4xl font-bold font-mono"
              style={{
                color: scoreColorVar(fund.total_gpa_score),
              }}
            >
              {fund.total_gpa_score.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Score summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Risk Score", value: fund.risk_score },
          { label: "Return Score", value: fund.return_score },
          { label: "Market Cap", value: fund.market_cap_score },
          { label: "Turnover", value: fund.turnover_score },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border p-4 text-center"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--card-border)",
            }}
          >
            <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
              {label}
            </div>
            <div className="text-xl font-bold font-mono">
              {value.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Detailed breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
            Risk Breakdown
          </h2>
          {Object.entries(fund.risk_breakdown).map(([key, val]) => (
            <ScoreBar key={key} label={key} value={val} />
          ))}
        </div>

        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
            Return Breakdown
          </h2>
          {Object.entries(fund.return_breakdown).map(([key, val]) => (
            <ScoreBar key={key} label={key} value={val} />
          ))}
        </div>
      </div>
    </div>
  );
}
