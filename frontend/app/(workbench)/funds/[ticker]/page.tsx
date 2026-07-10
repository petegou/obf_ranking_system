import Link from "next/link";
import { ScoreBar } from "@/components/score-bar";
import { getFundDetail } from "@/lib/queries";
import { scoreColorVar } from "@/lib/score-color";
import { snapshotDateFromSearchParams } from "@/lib/snapshot-date";

export const dynamic = "force-dynamic";

export default async function FundDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const { ticker } = await params;
  const asOfDate = snapshotDateFromSearchParams(await searchParams);
  const fund = await getFundDetail(ticker, asOfDate);
  const overviewHref = asOfDate ? `/?date=${encodeURIComponent(asOfDate)}` : "/";

  if (!fund) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <Link
          href={overviewHref}
          className="text-sm font-medium no-underline hover:underline"
          style={{ color: "var(--brand-primary)" }}
        >
          &larr; All Categories
        </Link>
        <div
          className="text-center py-16 mt-6 rounded-lg border"
          style={{
            backgroundColor: "var(--surface-card)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-tertiary)",
          }}
        >
          <p className="text-lg">Fund &ldquo;{ticker}&rdquo; not found</p>
        </div>
      </div>
    );
  }

  const categoryHref = `/categories/${encodeURIComponent(fund.category)}${
    asOfDate ? `?date=${encodeURIComponent(asOfDate)}` : ""
  }`;
  const totalScore = fund.total_gpa_score ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={categoryHref}
          className="text-sm font-medium no-underline hover:underline"
          style={{ color: "var(--brand-primary)" }}
        >
          &larr; {fund.category}
        </Link>
      </div>

      {/* Header */}
      <div
        className="rounded-lg border p-6 mb-6"
        style={{
          backgroundColor: "var(--surface-card)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
              {fund.ticker}
            </h1>
            <p style={{ color: "var(--text-tertiary)" }}>{fund.name}</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
              {fund.category} &middot; Rank #{fund.rank ?? "-"} &middot; As of{" "}
              {fund.as_of_date}
            </p>
          </div>
          <div className="text-center sm:text-right">
            <div className="text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>
              Total GPA Score
            </div>
            <div
              className="text-4xl font-bold font-mono"
              style={{
                color: scoreColorVar(totalScore),
              }}
            >
              {totalScore.toFixed(2)}
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
              backgroundColor: "var(--surface-card)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div className="text-xs font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>
              {label}
            </div>
            <div className="text-xl font-bold font-mono">
              {(value ?? 0).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Detailed breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: "var(--surface-card)",
            borderColor: "var(--border-subtle)",
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
            backgroundColor: "var(--surface-card)",
            borderColor: "var(--border-subtle)",
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
