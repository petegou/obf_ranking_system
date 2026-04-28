import Link from "next/link";
import { getCategories, getCategoryCounts } from "@/lib/queries";

export default async function HomePage() {
  const [categories, counts] = await Promise.all([
    getCategories(),
    getCategoryCounts(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: "var(--foreground)" }}
          >
            Fund Rankings by Category
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

      {categories.length === 0 ? (
        <div
          className="text-center py-20 rounded-lg border"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
            color: "var(--text-muted)",
          }}
        >
          <p className="text-lg mb-2">No categories available</p>
          <p className="text-sm">Upload fund data to populate rankings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
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
                <div className="flex items-start justify-between mb-3 gap-2">
                  <h3
                    className="text-lg font-semibold group-hover:underline"
                    style={{ color: "var(--foreground)" }}
                  >
                    {cat}
                  </h3>
                  <span
                    className="text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap"
                    style={{
                      backgroundColor: "var(--accent-muted)",
                      color: "var(--accent)",
                    }}
                  >
                    {fundCount} funds
                  </span>
                </div>
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
      )}
    </div>
  );
}
