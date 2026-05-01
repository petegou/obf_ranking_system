import Link from "next/link";
import { ScoreBar } from "@/components/score-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFundDetail, getFundPeerStats, type FundPeerStats } from "@/lib/queries";
import { scoreColorVar } from "@/lib/score-color";
import { MarketDataPlaceholder } from "./market-data-placeholder";
import { PeerComparisonChart } from "./peer-comparison-chart";
import { CategoryScatterChart } from "./category-scatter";
import { FundComparisonChart } from "./fund-comparison-chart";
import type { RankingRow } from "./rankings-grid";

type FundDetail = NonNullable<Awaited<ReturnType<typeof getFundDetail>>>;

export async function FundDetailPanel({
  tickers,
  rows,
}: {
  tickers: string[];
  rows: RankingRow[];
}) {
  if (tickers.length === 0) return null;

  const fundDetails = await Promise.all(
    tickers.map(async (ticker) => {
      const [fund, peer] = await Promise.all([
        getFundDetail(ticker),
        getFundPeerStats(ticker),
      ]);
      return { ticker, fund, peer };
    })
  );

  // Multi-fund comparison mode
  if (tickers.length >= 2) {
    return (
      <div className="p-4 flex-1 min-h-0 overflow-y-auto">
        <Tabs defaultValue="all">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all" className="min-w-14 flex-none text-xs">
              All
            </TabsTrigger>
            {tickers.map((ticker) => (
              <TabsTrigger
                key={ticker}
                value={ticker}
                className="min-w-20 flex-none font-mono text-xs"
              >
                {ticker}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <header className="mb-4">
              <p className="text-xs text-[var(--text-tertiary)]">
                Comparing {tickers.length} funds — decision support only.
              </p>
            </header>
            <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3">
              <h3 className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">
                Score profile
              </h3>
              <FundComparisonChart rows={rows} selectedTickers={tickers} />
            </section>
            <section className="mt-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)]">
                Efficiency curve
              </h3>
              <CategoryScatterChart rows={rows} selectedTickers={tickers} />
            </section>
          </TabsContent>

          {fundDetails.map(({ ticker, fund, peer }) => (
            <TabsContent key={ticker} value={ticker} className="mt-4">
              {fund ? (
                <SingleFundDetail fund={fund} peer={peer} rows={rows} />
              ) : (
                <MissingFund ticker={ticker} />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  // Single-fund mode
  const { ticker, fund, peer } = fundDetails[0];

  if (!fund) {
    return (
      <div className="p-4 flex-1 min-h-0">
        <MissingFund ticker={ticker} />
      </div>
    );
  }

  return (
    <div className="p-4 flex-1 min-h-0 overflow-y-auto">
      <SingleFundDetail fund={fund} peer={peer} rows={rows} />
    </div>
  );
}

function MissingFund({ ticker }: { ticker: string }) {
  return (
    <div className="text-sm text-[var(--text-tertiary)]">
      Fund {ticker} not found in current rankings.
    </div>
  );
}

function SingleFundDetail({
  fund,
  peer,
  rows,
}: {
  fund: FundDetail;
  peer: FundPeerStats | null;
  rows: RankingRow[];
}) {
  const totalScore = fund.total_gpa_score ?? 0;

  return (
    <>
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
            <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3">
              <h3 className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">
                Score profile
              </h3>
              <PeerComparisonChart metrics={peer.metrics} />
            </section>
          ) : (
            <p className="text-xs text-[var(--text-tertiary)]">
              Peer comparison unavailable for this fund.
            </p>
          )}
          <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)]">
              Efficiency curve
            </h3>
            <CategoryScatterChart rows={rows} selectedTickers={[fund.ticker]} />
          </section>
        </TabsContent>

        <TabsContent value="market" className="mt-4">
          <MarketDataPlaceholder />
        </TabsContent>
      </Tabs>
    </>
  );
}
