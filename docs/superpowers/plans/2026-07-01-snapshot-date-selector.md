# Snapshot Date Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authenticated users switch between uploaded ranking snapshots by `as_of_date` across the workbench UI.

**Architecture:** Use the URL query string as the single source of truth: `?date=YYYY-MM-DD`. Server-rendered pages read `searchParams.date` and query Supabase for that snapshot; persistent client shell components read the same URL value and refetch date-sensitive data through API routes. This keeps refresh/share/back-forward behavior correct while avoiding a broad client-side rewrite of the App Router pages.

**Tech Stack:** Next.js App Router, TypeScript, Supabase/PostgREST, existing shadcn-style UI primitives, native `<select>` for the snapshot picker, no new dependencies.

---

## Clarifications / Assumptions

- The selector is visible to all authenticated users, not only admins.
- `Latest` is the default selector option. Selecting `Latest` removes the `date` query parameter and resolves to the newest available ranking snapshot.
- The `Latest` option must still show the resolved snapshot date in the UI, e.g. `Latest (May 20, 2026)`, so users always know which data set they are viewing.
- Selecting a specific historical date writes an explicit `date=YYYY-MM-DD` query parameter.
- If no `date` parameter is present, pages keep the existing behavior: resolve to the latest available ranking snapshot.
- Existing query params such as `fund=SPYG` are preserved when changing dates. If a selected fund is absent from the chosen snapshot, the existing detail panel should show a clear missing-fund state instead of silently dropping the selection.
- Placeholder pages (`/compare`, `/scatter`, `/distribution`) do not need new snapshot-aware data yet, but shell navigation should preserve the `date` param there.

## Files And Responsibilities

- Modify `frontend/lib/queries.ts`
  - Add `RankingSnapshot` type.
  - Add `getRankingSnapshots()` using the existing `category_counts` view, paginated, aggregated by `as_of_date`.
  - Add optional `asOfDate` parameters to overview/scatter/peer helpers that currently hard-code latest.
- Create `frontend/lib/snapshot-date.ts`
  - Shared constants and small helpers for parsing/formatting/preserving the `date` query param.
- Modify `frontend/app/api/categories/route.ts`
  - Accept optional `date`.
  - Return full category count/hierarchy rows for the sidebar, not only category names.
- Modify `frontend/app/api/funds/search/route.ts`
  - Accept optional `date`.
  - When a date is provided, search only funds present in that snapshot.
- Create `frontend/app/api/ranking-snapshots/route.ts`
  - Return available snapshot dates for future client refresh and diagnostics.
- Modify `frontend/app/(workbench)/layout.tsx`
  - Fetch snapshot list and initial latest categories.
  - Pass them into the shell.
- Modify `frontend/components/shell/app-shell.tsx`
  - Accept `snapshots` and `initialCategories`.
  - Keep sidebar category data synchronized with URL `date`.
- Create `frontend/components/shell/snapshot-selector.tsx`
  - Client dropdown in the top bar that reads/writes `date` in the URL.
- Modify `frontend/components/shell/top-bar.tsx`
  - Render `SnapshotSelector`.
  - Preserve `date` in breadcrumb links.
- Modify `frontend/components/shell/sidebar.tsx`
  - Preserve `date` in category links.
  - Render an empty state when the selected snapshot has no categories.
- Modify `frontend/components/shell/fund-search.tsx`
  - Include selected `date` in search requests and fund-page navigation.
- Modify `frontend/app/(workbench)/page.tsx`
  - Read `searchParams.date`.
  - Pass date into overview queries.
- Modify `frontend/app/(workbench)/categories/[category]/page.tsx`
  - Read `searchParams.date`.
  - Pass date into category rankings and fund detail panel.
  - Show selected/resolved `as_of_date`.
- Modify `frontend/components/workbench/fund-detail-panel.tsx`
  - Accept `asOfDate`.
  - Pass it into `getFundDetail()` and `getFundPeerStats()`.
- Modify `frontend/app/(workbench)/funds/[ticker]/page.tsx`
  - Read `searchParams.date`.
  - Pass date into fund detail query.
  - Preserve date on the back-to-category link.
- Verify `frontend/components/workbench/rankings-grid.tsx`
  - Existing selection logic already copies `searchParams`; confirm it preserves `date` while replacing `fund`.

---

## Task 1: Add Snapshot Helpers And Query Support

**Files:**
- Create: `frontend/lib/snapshot-date.ts`
- Modify: `frontend/lib/queries.ts`

- [ ] **Step 1: Create shared snapshot-date helpers**

Add `frontend/lib/snapshot-date.ts`:

```ts
export const SNAPSHOT_DATE_PARAM = "date";

export interface SearchParamLike {
  get(name: string): string | null;
  toString(): string;
}

export function firstParam(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function isIsoSnapshotDate(value: string | null): value is string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "");
}

export function snapshotDateFromSearchParams(
  params: { date?: string | string[] } | SearchParamLike
): string | null {
  const raw =
    "get" in params
      ? params.get(SNAPSHOT_DATE_PARAM)
      : firstParam(params.date);
  return isIsoSnapshotDate(raw) ? raw : null;
}

export function formatSnapshotDate(date: string | null): string {
  if (!date) return "Latest";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
```

- [ ] **Step 2: Add snapshot list query helper**

In `frontend/lib/queries.ts`, add:

```ts
export interface RankingSnapshot {
  asOfDate: string;
  fundCount: number;
}

export async function getRankingSnapshots(): Promise<RankingSnapshot[]> {
  const byDate = new Map<string, number>();

  for (let from = 0; ; from += OVERVIEW_PAGE_SIZE) {
    const to = from + OVERVIEW_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("category_counts")
      .select("as_of_date, fund_count")
      .order("as_of_date", { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);
    const page = data ?? [];

    for (const row of page) {
      if (!row.as_of_date) continue;
      byDate.set(
        row.as_of_date,
        (byDate.get(row.as_of_date) ?? 0) + (row.fund_count ?? 0)
      );
    }

    if (page.length < OVERVIEW_PAGE_SIZE) break;
  }

  return Array.from(byDate.entries())
    .map(([asOfDate, fundCount]) => ({ asOfDate, fundCount }))
    .sort((a, b) => b.asOfDate.localeCompare(a.asOfDate));
}
```

Rationale: use the existing `category_counts` view instead of scanning every `fund_rankings` row. The view has one row per category per snapshot and already includes the sidebar counts.

- [ ] **Step 3: Make overview helpers date-aware**

Change these signatures in `frontend/lib/queries.ts`:

```ts
export async function getOverviewKpis(
  asOfDate?: string | null
): Promise<OverviewKpis> {
  const date = await resolveAsOfDate(asOfDate ?? null);
  // existing body unchanged
}

export async function getOverviewDecisionDashboard(
  asOfDate?: string | null
): Promise<OverviewDecisionDashboard> {
  const date = await resolveAsOfDate(asOfDate ?? null);
  // existing body unchanged
}

export async function getAllFundsForScatter(
  asOfDate?: string | null
): Promise<FundScatterRow[]> {
  const date = await resolveAsOfDate(asOfDate ?? null);
  // existing body unchanged
}

export async function getFundPeerStats(
  ticker: string,
  asOfDate?: string | null
): Promise<FundPeerStats | null> {
  const date = await resolveAsOfDate(asOfDate ?? null, ticker);
  // existing body unchanged
}

export async function getHighestPerCategory(
  asOfDate?: string | null
): Promise<HighestPerCategoryRow[]> {
  const date = await resolveAsOfDate(asOfDate ?? null);
  // existing body unchanged
}
```

- [ ] **Step 4: Verify types**

Run:

```bash
cd frontend
npx tsc --noEmit
```

Expected: no new TypeScript errors.

---

## Task 2: Add Snapshot-Aware API Routes

**Files:**
- Modify: `frontend/app/api/categories/route.ts`
- Modify: `frontend/app/api/funds/search/route.ts`
- Create: `frontend/app/api/ranking-snapshots/route.ts`

- [ ] **Step 1: Update categories API**

Replace `frontend/app/api/categories/route.ts` with date-aware output:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getCategoriesWithCounts } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get("date");

  try {
    const categories = await getCategoriesWithCounts(dateParam);
    return NextResponse.json({ categories });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Add snapshots API**

Create `frontend/app/api/ranking-snapshots/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getRankingSnapshots } from "@/lib/queries";

export async function GET() {
  try {
    const snapshots = await getRankingSnapshots();
    return NextResponse.json({ snapshots });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Make fund search date-aware**

Update `frontend/app/api/funds/search/route.ts`:

```ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { resolveAsOfDate } from "@/lib/rankings-utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const dateParam = searchParams.get("date");

  if (q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  const date = await resolveAsOfDate(dateParam);

  if (date) {
    const { data, error } = await supabase
      .from("fund_rankings")
      .select("ticker, funds!inner(name, category)")
      .eq("as_of_date", date)
      .ilike("ticker", `${q}%`)
      .order("ticker")
      .limit(8);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = (data ?? []).map((row) => {
      const fund = Array.isArray(row.funds) ? row.funds[0] : row.funds;
      return {
        ticker: row.ticker,
        name: fund?.name ?? row.ticker,
        category: fund?.category ?? "",
      };
    });

    return NextResponse.json({ results, as_of_date: date });
  }

  const { data, error } = await supabase
    .from("funds")
    .select("ticker, name, category")
    .ilike("ticker", `${q}%`)
    .order("ticker")
    .limit(8);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ results: data ?? [] });
}
```

- [ ] **Step 4: Verify route types**

Run:

```bash
cd frontend
npx tsc --noEmit
```

Expected: no new TypeScript errors. If Supabase join typing complains, introduce a local `type Row = { ticker: string; funds: { name: string; category: string } | { name: string; category: string }[] | null }` and cast `data as unknown as Row[]`.

---

## Task 3: Wire The Shell And Snapshot Selector

**Files:**
- Modify: `frontend/app/(workbench)/layout.tsx`
- Modify: `frontend/components/shell/app-shell.tsx`
- Modify: `frontend/components/shell/top-bar.tsx`
- Create: `frontend/components/shell/snapshot-selector.tsx`
- Modify: `frontend/components/shell/sidebar.tsx`
- Modify: `frontend/components/shell/fund-search.tsx`

- [ ] **Step 1: Pass snapshot data from the workbench layout**

Change `frontend/app/(workbench)/layout.tsx`:

```ts
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/shell/app-shell";
import { getCategoriesWithCounts, getRankingSnapshots } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function WorkbenchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [snapshots, categories] = await Promise.all([
    getRankingSnapshots(),
    getCategoriesWithCounts(),
  ]);

  return (
    <Providers>
      <AppShell snapshots={snapshots} initialCategories={categories}>
        {children}
      </AppShell>
    </Providers>
  );
}
```

- [ ] **Step 2: Update AppShell props and sidebar data state**

In `frontend/components/shell/app-shell.tsx`, keep `AppShell` client-safe by letting child client components read the URL. Use the existing `CategoryNavItem` type and add:

```ts
import type { RankingSnapshot } from "@/lib/queries";

export function AppShell({
  snapshots,
  initialCategories,
  children,
}: {
  snapshots: RankingSnapshot[];
  initialCategories: CategoryNavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex bg-[var(--surface-base)] overflow-hidden">
      <Sidebar initialCategories={initialCategories} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <TopBar snapshots={snapshots} />
        <main className="flex-1 min-w-0 min-h-0 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create SnapshotSelector**

Create `frontend/components/shell/snapshot-selector.tsx`:

```tsx
"use client";

import { CalendarDays } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RankingSnapshot } from "@/lib/queries";
import {
  formatSnapshotDate,
  SNAPSHOT_DATE_PARAM,
  snapshotDateFromSearchParams,
} from "@/lib/snapshot-date";

const LATEST_VALUE = "__latest__";

export function SnapshotSelector({
  snapshots,
}: {
  snapshots: RankingSnapshot[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const latestDate = snapshots[0]?.asOfDate ?? "";
  const explicitDate = snapshotDateFromSearchParams(searchParams);
  const selectedValue = explicitDate ?? LATEST_VALUE;
  const latestLabel = latestDate
    ? `Latest (${formatSnapshotDate(latestDate)})`
    : "Latest";

  function changeSnapshot(nextValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextValue === LATEST_VALUE) {
      params.delete(SNAPSHOT_DATE_PARAM);
    } else {
      params.set(SNAPSHOT_DATE_PARAM, nextValue);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  if (snapshots.length === 0) {
    return (
      <div className="hidden items-center gap-1.5 text-xs text-[var(--text-tertiary)] sm:flex">
        <CalendarDays className="size-3.5" />
        No snapshots
      </div>
    );
  }

  return (
    <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
      <CalendarDays className="size-3.5 text-[var(--text-tertiary)]" />
      <span className="sr-only">Ranking snapshot</span>
      <select
        value={selectedValue}
        onChange={(event) => changeSnapshot(event.target.value)}
        className="h-8 max-w-44 rounded-md border border-[var(--border-default)] bg-[var(--surface-card)] px-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
      >
        <option value={LATEST_VALUE}>{latestLabel}</option>
        {snapshots.map((snapshot) => (
          <option key={snapshot.asOfDate} value={snapshot.asOfDate}>
            {formatSnapshotDate(snapshot.asOfDate)}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 4: Render selector in TopBar and preserve date in breadcrumbs**

In `frontend/components/shell/top-bar.tsx`:

```tsx
import { usePathname, useSearchParams } from "next/navigation";
import type { RankingSnapshot } from "@/lib/queries";
import { SnapshotSelector } from "./snapshot-selector";
```

Change `TopBar` signature:

```tsx
export function TopBar({ snapshots }: { snapshots: RankingSnapshot[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const crumbs = parseCrumbs(pathname);
```

Add helper inside `TopBar`:

```tsx
  function withCurrentDate(href: string) {
    const date = searchParams.get("date");
    if (!date) return href;
    const [path, query = ""] = href.split("?");
    const params = new URLSearchParams(query);
    params.set("date", date);
    return `${path}?${params.toString()}`;
  }
```

Use `href={withCurrentDate(c.href)}` for breadcrumb links and render:

```tsx
<SnapshotSelector snapshots={snapshots} />
<FundSearch />
```

Place the selector before fund search so the current data context is visible.

- [ ] **Step 5: Make Sidebar fetch categories for selected date**

In `frontend/components/shell/sidebar.tsx`, change the prop to:

```tsx
export function Sidebar({
  initialCategories,
}: {
  initialCategories: CategoryNavItem[];
}) {
```

Add imports:

```tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { snapshotDateFromSearchParams } from "@/lib/snapshot-date";
```

Inside `Sidebar`, add:

```tsx
  const searchParams = useSearchParams();
  const selectedDate = snapshotDateFromSearchParams(searchParams);
  const [categories, setCategories] = useState(initialCategories);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (selectedDate) params.set("date", selectedDate);

    setIsLoadingCategories(true);
    fetch(`/api/categories${params.toString() ? `?${params.toString()}` : ""}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Unable to load categories"))))
      .then((body: { categories?: CategoryNavItem[] }) => {
        setCategories(body.categories ?? []);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingCategories(false);
      });

    return () => controller.abort();
  }, [selectedDate]);
```

When building leaf links, preserve `date`:

```tsx
const params = new URLSearchParams();
const date = searchParams.get("date");
if (date) params.set("date", date);
const href = `/categories/${encodeURIComponent(node.category)}${
  params.toString() ? `?${params.toString()}` : ""
}`;
```

Add a small empty state under the category section label:

```tsx
{tree.length === 0 ? (
  <div className="px-3 py-2 text-xs text-[var(--text-tertiary)]">
    No categories in this snapshot.
  </div>
) : null}
```

- [ ] **Step 6: Make fund search preserve selected date**

In `frontend/components/shell/fund-search.tsx`:

```tsx
import { useRouter, useSearchParams } from "next/navigation";
import { snapshotDateFromSearchParams } from "@/lib/snapshot-date";
```

Inside component:

```tsx
const searchParams = useSearchParams();
const selectedDate = snapshotDateFromSearchParams(searchParams);
```

Include date in the fetch:

```tsx
const params = new URLSearchParams({ q: query });
if (selectedDate) params.set("date", selectedDate);
const res = await fetch(`/api/funds/search?${params.toString()}`, {
  signal: controller.signal,
});
```

Preserve date in navigation:

```tsx
const params = new URLSearchParams();
if (selectedDate) params.set("date", selectedDate);
router.push(
  `/funds/${encodeURIComponent(ticker)}${
    params.toString() ? `?${params.toString()}` : ""
  }`
);
```

- [ ] **Step 7: Verify shell typecheck**

Run:

```bash
cd frontend
npx tsc --noEmit
```

Expected: no new TypeScript errors.

---

## Task 4: Make Workbench Pages Date-Aware

**Files:**
- Modify: `frontend/app/(workbench)/page.tsx`
- Modify: `frontend/app/(workbench)/categories/[category]/page.tsx`
- Modify: `frontend/components/workbench/fund-detail-panel.tsx`
- Modify: `frontend/app/(workbench)/funds/[ticker]/page.tsx`

- [ ] **Step 1: Overview page reads date**

Change `frontend/app/(workbench)/page.tsx`:

```tsx
import { snapshotDateFromSearchParams } from "@/lib/snapshot-date";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const date = snapshotDateFromSearchParams(await searchParams);
  const [kpis, dashboard] = await Promise.all([
    getOverviewKpis(date),
    getOverviewDecisionDashboard(date),
  ]);
```

- [ ] **Step 2: Category page reads date and passes it down**

Change `frontend/app/(workbench)/categories/[category]/page.tsx` props:

```tsx
interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ fund?: string | string[]; date?: string | string[] }>;
}
```

Then:

```tsx
const { fund, ...rawSearchParams } = await searchParams;
const asOfDate = snapshotDateFromSearchParams(rawSearchParams);
const result = await getRankingsForCategory(category, asOfDate);
```

Pass `asOfDate={result.as_of_date}` to `FundDetailPanel`.

Show date in the header:

```tsx
<p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
  {rows.length} funds ranked as of {result.as_of_date ?? "the latest snapshot"} -
  decision support only.
</p>
```

- [ ] **Step 3: Fund detail panel accepts date**

Change `frontend/components/workbench/fund-detail-panel.tsx`:

```tsx
export async function FundDetailPanel({
  tickers,
  rows,
  asOfDate,
}: {
  tickers: string[];
  rows: RankingRow[];
  asOfDate: string | null;
}) {
```

Change fetches:

```tsx
const [fund, peer] = await Promise.all([
  getFundDetail(ticker, asOfDate),
  getFundPeerStats(ticker, asOfDate),
]);
```

Update `MissingFund` copy:

```tsx
Fund {ticker} not found in the selected ranking snapshot.
```

- [ ] **Step 4: Full fund page reads date and preserves back link**

Change `frontend/app/(workbench)/funds/[ticker]/page.tsx` props:

```tsx
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
```

Create a back link:

```tsx
const categoryHref = fund
  ? `/categories/${encodeURIComponent(fund.category)}${
      asOfDate ? `?date=${encodeURIComponent(asOfDate)}` : ""
    }`
  : "/";
```

Use `categoryHref` for the category link.

- [ ] **Step 5: Verify page typecheck**

Run:

```bash
cd frontend
npx tsc --noEmit
```

Expected: no new TypeScript errors.

---

## Task 5: URL Preservation And Empty-State Polish

**Files:**
- Modify: `frontend/components/workbench/rankings-grid.tsx`
- Modify: `frontend/components/shell/sidebar.tsx`
- Modify: `frontend/components/shell/top-bar.tsx`
- Modify: `frontend/app/(workbench)/categories/[category]/page.tsx`

- [ ] **Step 1: Confirm RankingsGrid preserves date**

The existing selection code starts with:

```ts
const params = new URLSearchParams(searchParams.toString());
params.delete("fund");
next.forEach((t) => params.append("fund", t));
```

This should preserve `date`. Do not rewrite it unless verification shows otherwise.

- [ ] **Step 2: Add category empty state**

If `rows.length === 0`, render a small unframed empty state in the category page instead of an empty grid:

```tsx
{rows.length === 0 ? (
  <div className="flex flex-1 items-center justify-center px-6 py-10 text-sm text-[var(--text-tertiary)]">
    No rankings found for {category} in the selected snapshot.
  </div>
) : (
  <RankingsGrid
    rows={rows}
    category={category}
    columnControlsId={columnControlsId}
  />
)}
```

Keep this inside the existing layout, not as a nested card.

- [ ] **Step 3: Preserve date in static sidebar links**

For non-category links such as `/`, `/compare`, `/scatter`, `/distribution`, `/formulas`, and `/upload`, preserve `date` if present. Use a helper inside `Sidebar`:

```tsx
function withCurrentDate(href: string) {
  const date = searchParams.get("date");
  if (!date) return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("date", date);
  return `${path}?${params.toString()}`;
}
```

Apply it to `NavLink href` values.

- [ ] **Step 4: Verify URL behavior manually**

Run the app and check:

```bash
cd frontend
npm run dev
```

Expected browser behavior:

- `/categories/Alternatives?date=2026-05-20` loads the `2026-05-20` rows.
- The selector defaults to `Latest (resolved date)` when no `date` param is present.
- Selecting `Latest` removes `date` from the URL while continuing to show the resolved latest date in the selector.
- Selecting a different date updates only `date`, preserving `fund` if present.
- Selecting a fund updates only `fund`, preserving `date`.
- Sidebar category links preserve `date`.
- Fund search result links preserve `date`.
- Refresh keeps the same snapshot.
- Back/forward navigates through snapshot changes.

---

## Task 6: Final Verification

**Files:**
- No new files unless verification reveals a defect.

- [ ] **Step 1: Run typecheck**

```bash
cd frontend
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 2: Run lint**

```bash
cd frontend
npm run lint
```

Expected: exit 0.

- [ ] **Step 3: Run production build**

```bash
cd frontend
npm run build
```

Expected: exit 0. The existing multiple-lockfile workspace-root warning may still appear; do not treat it as a regression.

- [ ] **Step 4: Browser smoke test**

Using an authenticated account, verify:

- Overview KPI As Of changes when `date` changes.
- Sidebar counts change to match selected snapshot.
- Category grid rows match selected snapshot.
- Fund detail panel and full fund page use the selected snapshot.
- Fund search only returns funds present in the selected snapshot.
- Direct links with `?date=YYYY-MM-DD` work after refresh.
- Invalid/nonexistent date shows empty states rather than silently showing latest data.

- [ ] **Step 5: Update task log**

Update `tasks/todo.md` with verification results and any gated-on-user-action browser checks.

---

## Risks And Notes

- **Layout search params:** App Router layouts do not receive `searchParams`. This is why the sidebar must be client-refetched from the URL rather than purely server-rendered.
- **PostgREST caps:** `getRankingSnapshots()` must page through `category_counts`; do not use an unbounded select.
- **Silent fallback risk:** If a user explicitly requests `?date=2026-01-01` and no data exists, do not silently show latest data. That would be misleading for financial review.
- **No new dependencies:** Use native `<select>` and existing UI primitives.
- **RLS/policy impact:** No schema or RLS changes are required for this plan.

## Decision Confirmed Before Execution

The selector includes a separate `Latest` option. `Latest` is the default state, clears the `date` query parameter, and displays the resolved latest snapshot date in the UI. Selecting any specific snapshot date writes `date=YYYY-MM-DD` into the URL.
