import Link from "next/link";
import { getRankingsForCategory } from "@/lib/queries";
import { scoreColorVar } from "@/lib/score-color";

export const dynamic = "force-dynamic";

async function getRankings(category: string) {
  const result = await getRankingsForCategory(category);
  return result.rankings;
}

export default async function RankingsPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: rawCategory } = await params;
  const category = decodeURIComponent(rawCategory);
  const rankings = await getRankings(category);

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
          {category}
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          {rankings.length} funds ranked by Oak Bridge multi-factor score
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
          <p>No rankings available for this category.</p>
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
                  <th className="text-left px-4 py-3 font-semibold w-16">
                    Rank
                  </th>
                  <th className="text-left px-4 py-3 font-semibold">Ticker</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">
                    Name
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
                    key={fund.ticker}
                    className="transition-colors"
                    style={{
                      borderTop: "1px solid var(--card-border)",
                      backgroundColor:
                        i % 2 === 0 ? "transparent" : "var(--accent-muted)",
                    }}
                  >
                    <td className="px-4 py-3 font-mono font-bold">
                      {fund.rank}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/funds/${encodeURIComponent(fund.ticker)}`}
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
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span style={{ color: scoreColorVar(fund.total_gpa_score) }}>
                        {fund.total_gpa_score.toFixed(2)}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono hidden sm:table-cell"
                      style={{ color: scoreColorVar(fund.risk_score) }}
                    >
                      {fund.risk_score.toFixed(1)}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono hidden sm:table-cell"
                      style={{ color: scoreColorVar(fund.return_score) }}
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
