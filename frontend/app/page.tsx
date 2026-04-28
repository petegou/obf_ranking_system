import Link from "next/link";
import { getBaseUrl } from "@/lib/api";


const CATEGORY_META: Record<string, { description: string; group: string }> = {
  "Large Cap Growth": {
    description: "High-growth large companies focused on capital appreciation",
    group: "US Equity",
  },
  "Large Cap Value": {
    description: "Undervalued large companies with strong fundamentals",
    group: "US Equity",
  },
  "Large Cap Blend": {
    description: "Mix of growth and value across large-cap equities",
    group: "US Equity",
  },
  "Mid Cap Growth": {
    description: "Growth-oriented mid-sized companies",
    group: "US Equity",
  },
  "Mid Cap Value": {
    description: "Value-focused mid-sized companies",
    group: "US Equity",
  },
  "Mid Cap Blend": {
    description: "Blended approach across mid-cap equities",
    group: "US Equity",
  },
  "Small Cap Growth": {
    description: "High-growth small companies with upside potential",
    group: "US Equity",
  },
  "Small Cap Value": {
    description: "Undervalued small companies at attractive prices",
    group: "US Equity",
  },
  "Small Cap Blend": {
    description: "Diversified small-cap equity exposure",
    group: "US Equity",
  },
  "International Developed": {
    description: "Equities from developed markets outside the US",
    group: "International",
  },
  "International Emerging": {
    description: "Equities from emerging and frontier markets",
    group: "International",
  },
  "Fixed Income": {
    description: "Bonds and fixed-income securities for stability and yield",
    group: "Fixed Income & Alternatives",
  },
  Commodities: {
    description: "Exposure to physical commodities and natural resources",
    group: "Fixed Income & Alternatives",
  },
  Alternatives: {
    description: "Hedge fund strategies, market neutral, and managed futures",
    group: "Fixed Income & Alternatives",
  },
};

const GROUP_ORDER = [
  "US Equity",
  "International",
  "Fixed Income & Alternatives",
];

async function getCategories(): Promise<string[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/categories`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.categories;
  } catch {
    return [];
  }
}

async function getCategoryCounts(
  categories: string[]
): Promise<Record<string, number>> {
  const entries = await Promise.all(
    categories.map(async (cat) => {
      try {
        const res = await fetch(
          `${getBaseUrl()}/api/rankings?category=${encodeURIComponent(cat)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return [cat, 0] as const;
        const data = await res.json();
        return [cat, data.rankings?.length ?? 0] as const;
      } catch {
        return [cat, 0] as const;
      }
    })
  );
  return Object.fromEntries(entries);
}

export default async function HomePage() {
  const categories = await getCategories();
  const counts = await getCategoryCounts(categories);

  // Group categories
  const grouped: Record<string, string[]> = {};
  for (const group of GROUP_ORDER) {
    grouped[group] = [];
  }
  for (const cat of categories) {
    const meta = CATEGORY_META[cat];
    const group = meta?.group ?? "Other";
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(cat);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: "var(--foreground)" }}
          >
            Fund Rankings by Sector
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            Select a category to view ranked funds scored by the Oak Bridge
            multi-factor algorithm.
          </p>
        </div>
        <Link
          href="/funds"
          className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold no-underline transition-colors hover:opacity-90 shrink-0"
          style={{
            backgroundColor: "var(--accent)",
            color: "#ffffff",
          }}
        >
          View All Funds
          <span>&rarr;</span>
        </Link>
      </div>

      {GROUP_ORDER.map(
        (group) =>
          grouped[group]?.length > 0 && (
            <section key={group} className="mb-10">
              <h2
                className="text-lg font-semibold mb-4 uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                {group}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped[group].map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const fundCount = counts[cat] ?? 0;
                  return (
                    <Link
                      key={cat}
                      href={`/rankings/${encodeURIComponent(cat)}`}
                      className="group block rounded-lg border p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 no-underline"
                      style={{
                        backgroundColor: "var(--card-bg)",
                        borderColor: "var(--card-border)",
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3
                          className="text-lg font-semibold group-hover:underline"
                          style={{ color: "var(--foreground)" }}
                        >
                          {cat}
                        </h3>
                        <span
                          className="text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ml-2"
                          style={{
                            backgroundColor: "var(--accent-muted)",
                            color: "var(--accent)",
                          }}
                        >
                          {fundCount} funds
                        </span>
                      </div>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {meta?.description ?? ""}
                      </p>
                      <div
                        className="mt-4 text-sm font-medium flex items-center gap-1"
                        style={{ color: "var(--accent)" }}
                      >
                        View rankings
                        <span className="transition-transform group-hover:translate-x-1 inline-block">
                          &rarr;
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )
      )}

      {categories.length === 0 && (
        <div
          className="text-center py-20 rounded-lg border"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
            color: "var(--text-muted)",
          }}
        >
          <p className="text-lg mb-2">No categories available</p>
          <p className="text-sm">
            Make sure the backend is running at {getBaseUrl()}
          </p>
        </div>
      )}
    </div>
  );
}
