import Link from "next/link";
import { getAllRankings } from "@/lib/queries";

function scoreColor(score: number): string {
  if (score >= 70) return "#16a34a";
  if (score >= 50) return "#ca8a04";
  if (score >= 30) return "#ea580c";
  return "#dc2626";
}

export default async function AllFundsPage() {
  const { total, rankings } = await getAllRankings();

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm font-medium no-underline hover:underline"
          style={{ color: "var(--accent)" }}
        >
          &larr; All Categories
        </Link>
      </div>

      <div className="mb-8">
        <h1
          className="text-3xl font-bold mb-1"
          style={{ color: "var(--foreground)" }}
        >
          All Funds
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          {total} funds across all categories, sorted by GPA score
        </p>
      </div>

      {rankings.length === 0 ? (
        <div
          className="text-center py-16 rounded-lg border"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
            color: "var(--text-muted)",
          }}
        >
          <p>No fund data available.</p>
        </div>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    backgroundColor: "var(--accent-muted)",
                    color: "var(--text-muted)",
                  }}
                >
                  <th className="text-left px-4 py-3 font-semibold w-12">
                    #
                  </th>
                  <th className="text-left px-4 py-3 font-semibold">Ticker</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">
                    Category
                  </th>
                  <th className="text-right px-4 py-3 font-semibold">
                    GPA Score
                  </th>
                  <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">
                    Risk
                  </th>
                  <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">
                    Return
                  </th>
                  <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">
                    Mkt Cap
                  </th>
                  <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">
                    Turnover
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((fund, i) => (
                  <tr
                    key={`${fund.ticker}-${fund.category}`}
                    className="transition-colors"
                    style={{
                      borderTop: "1px solid var(--card-border)",
                      backgroundColor:
                        i % 2 === 0 ? "transparent" : "var(--accent-muted)",
                    }}
                  >
                    <td
                      className="px-4 py-3 font-mono"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/fund/${encodeURIComponent(fund.ticker)}`}
                        className="font-semibold no-underline hover:underline"
                        style={{ color: "var(--accent)" }}
                      >
                        {fund.ticker}
                      </Link>
                    </td>
                    <td
                      className="px-4 py-3 hidden md:table-cell"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {fund.name}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Link
                        href={`/rankings/${encodeURIComponent(fund.category)}`}
                        className="text-xs font-medium px-2 py-1 rounded-full no-underline hover:underline"
                        style={{
                          backgroundColor: "var(--accent-muted)",
                          color: "var(--accent)",
                        }}
                      >
                        {fund.category}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span style={{ color: scoreColor(fund.total_gpa_score) }}>
                        {fund.total_gpa_score.toFixed(2)}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono hidden sm:table-cell"
                      style={{ color: scoreColor(fund.risk_score) }}
                    >
                      {fund.risk_score.toFixed(1)}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono hidden sm:table-cell"
                      style={{ color: scoreColor(fund.return_score) }}
                    >
                      {fund.return_score.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono hidden lg:table-cell">
                      {fund.market_cap_score.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono hidden lg:table-cell">
                      {fund.turnover_score.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
