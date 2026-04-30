import Link from "next/link";
import { ScoreBar } from "@/components/score-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFundDetail, getFundPeerStats } from "@/lib/queries";
import { scoreColorVar } from "@/lib/score-color";
import { MarketDataPlaceholder } from "./market-data-placeholder";
import { PeerComparisonChart } from "./peer-comparison-chart";
import { CategoryScatterChart } from "./category-scatter";
import { FundComparisonChart } from "./fund-comparison-chart";
import type { RankingRow } from "./rankings-grid";

export async function FundDetailPanel({
  tickers,
  rows,
}: {
  tickers: string[];
  rows: RankingRow[];
}) {
  if (tickers.length === 0) return null;

  // Multi-fund comparison mode
  if (tickers.length >= 2) {
    return (
      <div className="p-4 flex-1 min-h-0 overflow-y-auto">
        <header className="mb-4">
          <div className="flex flex-wrap gap-2">
            {tickers.map((t) => (
              <span key={t} className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                {t}
              </span>
            ))}
          </div>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            Comparing {tickers.length} funds — decision support only.
          </p>
        </header>
        <FundComparisonChart rows={rows} selectedTickers={tickers} />
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
            Risk vs Return
          </p>
          <CategoryScatterChart rows={rows} selectedTickers={tickers} />
        </div>
      </div>
    );
  }

  // Single-fund mode
  const ticker = tickers[0];
  const [fund, peer] = await Promise.all([
    getFundDetail(ticker),
    getFundPeerStats(ticker),
  ]);

  if (!fund) {
    return (
      <div className="p-4 flex-1 min-h-0 text-sm text-[var(--text-tertiary)]">
        Fund {ticker} not found in current rankings.
      </div>
    );
  }

  const totalScore = fund.total_gpa_score ?? 0;

  return (
    <div className="p-4 flex-1 min-h-0 overflow-y-auto">
      <header className="mb-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-mono text-lg font-semibold text-[var(--text-primary)]">
            {fund.ticker}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            Rank {fund.rank ?? "-"}
          </div>
        </div>
        <div className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
          {fund.name}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className="font-mono text-3xl font-semibold tabular-nums"
            style={{ color: scoreColorVar(totalScore) }}
          >
            {totalScore.toFixed(1)}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">
            of 100 GPA
          </span>
        </div>
      </header>

      <Tabs defaultValue="overview">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1 text-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="peers" className="flex-1 text-xs">
            vs Peers
          </TabsTrigger>
          <TabsTrigger value="market" className="flex-1 text-xs">
            Market
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-2">
          <ScoreBar label="Risk" value={fund.risk_score ?? 0} />
          <ScoreBar label="Return" value={fund.return_score ?? 0} />
          <ScoreBar label="Market Cap" value={fund.market_cap_score ?? 0} />
          <ScoreBar label="Turnover" value={fund.turnover_score ?? 0} />
          <Link
            href={`/funds/${encodeURIComponent(fund.ticker)}`}
            className="mt-4 inline-block text-xs font-medium text-[var(--brand-primary)] no-underline hover:underline"
          >
            View full detail -&gt;
          </Link>
        </TabsContent>

        <TabsContent value="peers" className="mt-4 space-y-4">
          {peer && peer.metrics.length > 0 ? (
            <PeerComparisonChart metrics={peer.metrics} />
          ) : (
            <p className="text-xs text-[var(--text-tertiary)]">
              Peer comparison unavailable for this fund.
            </p>
          )}
          <div>
            <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
              Risk vs Return
            </p>
            <CategoryScatterChart rows={rows} selectedTickers={[ticker]} />
          </div>
        </TabsContent>

        <TabsContent value="market" className="mt-4">
          <MarketDataPlaceholder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
