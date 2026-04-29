# Dashboard UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 dashboard UI shell + overview + category workbench described in `docs/superpowers/specs/2026-04-29-dashboard-ui-design.md`.

**Architecture:** Persistent Next.js layout (`app/(workbench)/layout.tsx`) wraps every authenticated page with a sidebar (categories) + topbar (breadcrumb + search) + main slot. Two views fully built — overview dashboard (`/`) and category workbench (`/categories/[category]`) — with placeholders for `/compare`, `/scatter`, `/distribution`. Selection state lives in the URL.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, Supabase (existing), AG Grid + AG Charts (existing), shadcn/ui (new), motion (new), Inter + JetBrains Mono fonts.

**Verification:** No tests in this phase. Each task ends with a browser check at a specific route, then a commit.

> Note on Next.js version: per `frontend/AGENTS.md`, this project uses a Next.js build with breaking changes from typical training data. When in doubt about an API, check `frontend/node_modules/next/dist/docs/`. `params` and `searchParams` are Promises that must be awaited.

> **Working directory.** All paths in this plan are relative to `frontend/` unless prefixed with `/`. Run `cd frontend` before any `npm` command.

---

## File Map

**Created:**
```
frontend/
├── components.json                     # shadcn config (created by `shadcn init`)
├── components/
│   ├── ui/                              # shadcn primitives (button, card, tabs, etc.)
│   ├── shell/
│   │   ├── app-shell.tsx                # server: layout wrapper
│   │   ├── sidebar.tsx                  # client: categories nav + active state
│   │   ├── top-bar.tsx                  # server: breadcrumb + slots
│   │   ├── fund-search.tsx              # client: ticker typeahead
│   │   └── user-menu.tsx                # client: auth menu
│   ├── overview/
│   │   ├── kpi-strip.tsx                # server: 4 KPI cards
│   │   ├── risk-return-scatter.tsx      # client: AG Charts scatter
│   │   └── highest-per-category.tsx     # server: list with score bars
│   ├── workbench/
│   │   ├── rankings-grid.tsx            # client: AG Grid + URL selection
│   │   ├── fund-detail-panel.tsx        # server: tabs container
│   │   ├── empty-detail.tsx             # server: "select a fund" state
│   │   ├── peer-comparison-chart.tsx    # client: AG Charts grouped bar
│   │   └── market-data-placeholder.tsx  # server: "coming soon" card
│   ├── placeholders/
│   │   └── coming-soon-panel.tsx        # server: shared "coming soon"
│   └── score-bar.tsx                    # server: shared score bar (promoted)
├── lib/
│   └── score-color.ts                   # centralized score → color helper
├── app/
│   ├── (workbench)/
│   │   ├── layout.tsx                   # AppShell wrapper for authed routes
│   │   ├── page.tsx                     # overview at /
│   │   ├── loading.tsx                  # shared skeleton
│   │   ├── error.tsx                    # shared error boundary
│   │   ├── categories/[category]/
│   │   │   ├── page.tsx                 # category workbench
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   ├── funds/[ticker]/
│   │   │   └── page.tsx                 # MOVED from app/fund/[ticker]
│   │   ├── compare/page.tsx             # placeholder
│   │   ├── scatter/page.tsx             # placeholder
│   │   ├── distribution/page.tsx        # placeholder
│   │   ├── formulas/page.tsx            # MOVED from app/formulas
│   │   └── upload/page.tsx              # MOVED from app/upload
│   └── api/funds/search/route.ts        # ticker typeahead endpoint
```

**Modified:**
- `frontend/app/globals.css` — add color tokens, font variables
- `frontend/app/layout.tsx` — swap fonts to Inter + JetBrains Mono
- `frontend/lib/queries.ts` — add `getOverviewKpis`, `getAllFundsForScatter`, `getFundPeerStats`
- `frontend/next.config.ts` — add `/rankings/:cat` → `/categories/:cat` redirect
- `frontend/app/funds/[ticker]/page.tsx` — restyle with new tokens, use shared `<ScoreBar>`
- `frontend/package.json` — adds shadcn deps + motion (via npm/CLI, not by hand)

**Deleted at end:**
- `frontend/components/nav-header.tsx` (replaced by AppShell + Sidebar + TopBar)
- `frontend/app/fund/[ticker]/page.tsx` (moved into `(workbench)/funds/[ticker]/`)
- `frontend/app/formulas/page.tsx` (moved into `(workbench)/formulas/`)
- `frontend/app/upload/page.tsx` (moved into `(workbench)/upload/`)
- `frontend/app/funds/page.tsx` (legacy "all funds" list — superseded by overview + workbench; remove after verifying no internal links remain)

---

## Phase 1 — Setup

### Task 1: Install shadcn/ui and motion

**Files:**
- Create: `frontend/components.json` (via CLI)
- Modify: `frontend/package.json` (via npm)

- [ ] **Step 1.1: Initialize shadcn**

```bash
cd frontend
npx shadcn@latest init
```

Answer prompts:
- Style: **New York**
- Base color: **Neutral**
- CSS variables: **Yes**

This creates `components.json`, `components/ui/`, and updates `app/globals.css` with shadcn's CSS variable conventions.

- [ ] **Step 1.2: Install Phase 1 shadcn primitives**

```bash
npx shadcn@latest add button card tabs badge scroll-area tooltip skeleton input separator
```

- [ ] **Step 1.3: Install motion**

```bash
npm install motion
```

- [ ] **Step 1.4: Verify dev server still boots**

```bash
npm run dev
```

Open http://localhost:3000 — confirm the app still loads (it'll look unchanged at this point).

- [ ] **Step 1.5: Commit**

```bash
cd /Users/nickgoudeau/professionalProjects/obf_ranking_system
git add frontend/components.json frontend/components/ui frontend/package.json frontend/package-lock.json frontend/app/globals.css
git commit -m "Install shadcn/ui primitives and motion"
```

---

### Task 2: Add fonts and color tokens

**Files:**
- Modify: `frontend/app/globals.css`
- Modify: `frontend/app/layout.tsx`

- [ ] **Step 2.1: Update fonts in `app/layout.tsx`**

Replace the file contents with:

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Oak Bridge Fund Rankings",
  description:
    "Multi-factor scoring and ranking engine for mutual funds and ETFs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--surface-base)] text-[var(--text-primary)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

Note: `<NavHeader />` and `<footer>` are removed here — they'll be replaced by the new AppShell within the `(workbench)` group. Auth pages need their own layout (added in Task 7).

- [ ] **Step 2.2: Update `app/globals.css` color tokens**

Open `frontend/app/globals.css`. The shadcn init added a block of theme variables. Append the project's tokens at the end of the file (preserving shadcn's block above it):

```css
/* === Project tokens (Phase 1 dashboard redesign) === */
:root {
  /* Surface scale (monochrome chrome) */
  --surface-base: #fafafa;
  --surface-card: #ffffff;
  --surface-muted: #f5f5f5;
  --border-subtle: #ececec;
  --border-default: #e5e5e5;
  --text-primary: #0a0a0a;
  --text-secondary: #525252;
  --text-tertiary: #737373;
  --text-quaternary: #a3a3a3;

  /* Brand accents (used sparingly) */
  --brand-primary: #0d1f33;
  --brand-primary-tint: rgba(13, 31, 51, 0.04);
  --brand-gold: #c9a84c;

  /* Semantic data scale (score values only) */
  --score-strong: #15803d;
  --score-moderate: #a16207;
  --score-weak: #b91c1c;
}

@media (prefers-color-scheme: dark) {
  :root {
    --surface-base: #0a0a0a;
    --surface-card: #141414;
    --surface-muted: #1f1f1f;
    --border-subtle: #262626;
    --border-default: #303030;
    --text-primary: #fafafa;
    --text-secondary: #a3a3a3;
    --text-tertiary: #737373;
    --text-quaternary: #525252;

    --brand-primary: #4a8fd4;
    --brand-primary-tint: rgba(74, 143, 212, 0.08);
    --brand-gold: #d4af37;

    --score-strong: #16a34a;
    --score-moderate: #ca8a04;
    --score-weak: #ef4444;
  }
}
```

Leave shadcn's `:root` block (with `--background`, `--foreground`, `--primary`, etc.) intact — shadcn primitives need them.

Then update shadcn's `--primary` to use the brand navy. Find the `:root` block shadcn created and edit:

```css
--primary: 213 60% 13%;            /* #0d1f33 in HSL */
--primary-foreground: 0 0% 100%;
--ring: 213 60% 13%;
```

- [ ] **Step 2.3: Verify in browser**

```bash
npm run dev
```

Open http://localhost:3000 — page should render with new fonts (Inter, no longer Geist). Inspect the body to confirm `--surface-base` and `--text-primary` are set.

- [ ] **Step 2.4: Commit**

```bash
git add frontend/app/layout.tsx frontend/app/globals.css
git commit -m "Add Inter + JetBrains Mono fonts and Phase 1 color tokens"
```

---

### Task 3: Centralize `scoreColor()` into a shared module

**Files:**
- Create: `frontend/lib/score-color.ts`
- Modify: `frontend/app/rankings/[category]/page.tsx`
- Modify: `frontend/app/fund/[ticker]/page.tsx`

- [ ] **Step 3.1: Create `lib/score-color.ts`**

```ts
/**
 * Map a numeric score (0–100) to a CSS variable for semantic coloring.
 *
 * Bands:
 *  ≥ 70  → strong   (--score-strong)
 *  30–69 → moderate (--score-moderate)
 *  < 30  → weak     (--score-weak)
 *
 * Returns a CSS `var(...)` string suitable for `style={{ color }}`.
 */
export function scoreColorVar(score: number): string {
  if (score >= 70) return "var(--score-strong)";
  if (score >= 30) return "var(--score-moderate)";
  return "var(--score-weak)";
}
```

- [ ] **Step 3.2: Update `app/rankings/[category]/page.tsx`**

Replace the inline `scoreColor` function and references. At the top, replace the import-section additions:

```tsx
import { scoreColorVar } from "@/lib/score-color";
```

Delete the local `function scoreColor(score: number): string { ... }` definition. Replace every call to `scoreColor(...)` with `scoreColorVar(...)`. The `style={{ color: scoreColor(fund.total_gpa_score) }}` becomes `style={{ color: scoreColorVar(fund.total_gpa_score) }}`.

- [ ] **Step 3.3: Update `app/fund/[ticker]/page.tsx`**

Same treatment: import `scoreColorVar`, delete the local color logic in `<ScoreBar>` and the header total-GPA color, swap to `scoreColorVar(...)`.

In `<ScoreBar>`, replace the color cascade:

```tsx
function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const barColor = scoreColorVar(value);
  // ...rest unchanged
}
```

In the header card, the `style={{ color: ... }}` ternary on `total_gpa_score` becomes:

```tsx
style={{ color: scoreColorVar(fund.total_gpa_score) }}
```

- [ ] **Step 3.4: Verify in browser**

```bash
npm run dev
```

Visit http://localhost:3000/ → click into a category → verify score colors still render. Click a fund → verify score colors still render. Colors will look slightly different (deeper green / amber / red per new tokens) — this is expected.

- [ ] **Step 3.5: Commit**

```bash
git add frontend/lib/score-color.ts frontend/app/rankings frontend/app/fund
git commit -m "Centralize scoreColor helper and adopt new semantic palette"
```

---

## Phase 2 — Layout Shell

### Task 4: Create the auth-pages layout (so login/setup keep working)

**Files:**
- Create: `frontend/app/(auth)/layout.tsx`
- Move: `frontend/app/login/page.tsx` → `frontend/app/(auth)/login/page.tsx`
- Move: `frontend/app/auth/setup/page.tsx` → `frontend/app/(auth)/setup/page.tsx`
- Keep: `frontend/app/auth/callback/route.ts` (route handlers don't need a layout)

> Why: when we add `(workbench)/layout.tsx` it would otherwise also wrap the login screen. Putting auth pages in their own group keeps them full-screen.

- [ ] **Step 4.1: Create `app/(auth)/layout.tsx`**

```tsx
import { Providers } from "@/components/providers";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
```

- [ ] **Step 4.2: Move login page**

```bash
mkdir -p frontend/app/\(auth\)/login
git mv frontend/app/login/page.tsx frontend/app/\(auth\)/login/page.tsx
rmdir frontend/app/login
```

- [ ] **Step 4.3: Move setup page**

```bash
mkdir -p frontend/app/\(auth\)/setup
git mv frontend/app/auth/setup/page.tsx frontend/app/\(auth\)/setup/page.tsx
rmdir frontend/app/auth/setup
```

The route handler at `frontend/app/auth/callback/route.ts` stays put (its URL is `/auth/callback`, which is fine — handlers don't render a layout).

- [ ] **Step 4.4: Update root layout to drop Providers from there (Providers will live in each group's layout)**

Edit `frontend/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Oak Bridge Fund Rankings",
  description:
    "Multi-factor scoring and ranking engine for mutual funds and ETFs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--surface-base)] text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 4.5: Verify in browser**

```bash
npm run dev
```

Visit http://localhost:3000/login — should render normally. Sign in. Visit `/auth/setup` if you have an invite token URL.

- [ ] **Step 4.6: Commit**

```bash
git add frontend/app
git commit -m "Move auth pages into (auth) route group"
```

---

### Task 5: Build `<AppShell>` skeleton

**Files:**
- Create: `frontend/app/(workbench)/layout.tsx`
- Create: `frontend/components/shell/app-shell.tsx`

> The actual `<Sidebar>`, `<TopBar>` etc. are stubbed for this task. We'll fill them in subsequent tasks. Goal of this task: see the shell render with placeholder content.

- [ ] **Step 5.1: Create `app/(workbench)/layout.tsx`**

```tsx
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/shell/app-shell";
import { getCategoriesWithCounts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function WorkbenchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getCategoriesWithCounts();
  return (
    <Providers>
      <AppShell categories={categories}>{children}</AppShell>
    </Providers>
  );
}
```

- [ ] **Step 5.2: Create `components/shell/app-shell.tsx`**

```tsx
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

export interface CategoryNavItem {
  category: string;
  count: number;
}

export function AppShell({
  categories,
  children,
}: {
  categories: CategoryNavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-[var(--surface-base)]">
      <Sidebar categories={categories} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5.3: Stub `components/shell/sidebar.tsx`**

```tsx
"use client";

import type { CategoryNavItem } from "./app-shell";

export function Sidebar({ categories }: { categories: CategoryNavItem[] }) {
  return (
    <aside className="w-60 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
      <div className="text-sm font-semibold text-[var(--text-primary)]">
        Oak Bridge
      </div>
      <ul className="mt-4 space-y-1 text-xs text-[var(--text-tertiary)]">
        {categories.map((c) => (
          <li key={c.category}>{c.category} ({c.count})</li>
        ))}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 5.4: Stub `components/shell/top-bar.tsx`**

```tsx
export function TopBar() {
  return (
    <header className="h-11 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-card)] flex items-center px-4">
      <span className="text-sm text-[var(--text-tertiary)]">Top Bar</span>
    </header>
  );
}
```

- [ ] **Step 5.5: Move home page into the group temporarily as a stub**

```bash
mkdir -p frontend/app/\(workbench\)
```

Create `frontend/app/(workbench)/page.tsx` with a stub:

```tsx
export const dynamic = "force-dynamic";

export default function OverviewPlaceholder() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Overview (placeholder)</h1>
      <p className="mt-2 text-sm text-[var(--text-tertiary)]">
        AppShell is rendering — content area is here.
      </p>
    </div>
  );
}
```

Delete or rename `frontend/app/page.tsx` so this new one wins. Easiest: delete the old root `app/page.tsx` since the workbench group has its own.

```bash
rm frontend/app/page.tsx
```

- [ ] **Step 5.6: Verify in browser**

```bash
npm run dev
```

Sign in, visit http://localhost:3000/. You should see:
- Sidebar on the left listing all categories with counts
- Top bar with "Top Bar" placeholder
- "Overview (placeholder)" text in the main area

- [ ] **Step 5.7: Commit**

```bash
git add frontend/app frontend/components/shell
git commit -m "Add AppShell layout skeleton with sidebar + topbar stubs"
```

---

### Task 6: Build the real `<Sidebar>`

**Files:**
- Modify: `frontend/components/shell/sidebar.tsx`

- [ ] **Step 6.1: Implement the full sidebar**

Replace the contents of `frontend/components/shell/sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { CategoryNavItem } from "./app-shell";

interface NavLinkProps {
  href: string;
  label: string;
  count?: number;
  disabled?: boolean;
  isActive: (pathname: string) => boolean;
}

function NavLink({ href, label, count, disabled, isActive }: NavLinkProps) {
  const pathname = usePathname();
  const active = !disabled && isActive(pathname);
  const baseClasses =
    "flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors";

  if (disabled) {
    return (
      <span
        className={`${baseClasses} text-[var(--text-quaternary)] cursor-not-allowed`}
      >
        <span>{label}</span>
        <span className="text-[10px] uppercase tracking-wider">Soon</span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`${baseClasses} no-underline ${
        active
          ? "bg-[var(--brand-primary-tint)] text-[var(--brand-primary)] font-medium border-l-2 border-[var(--brand-primary)] pl-[10px]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
      }`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span className="font-mono text-[11px] text-[var(--text-quaternary)] tabular-nums">
          {count}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-4 pb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--text-quaternary)]">
      {children}
    </div>
  );
}

export function Sidebar({ categories }: { categories: CategoryNavItem[] }) {
  const { isAdmin, user, signOut } = useAuth();

  return (
    <aside className="w-60 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--surface-card)] flex flex-col">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
            Oak Bridge
          </span>
          <span className="block w-3 h-px bg-[var(--brand-gold)]" aria-hidden />
        </div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mt-0.5">
          Fund Rankings
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <SectionLabel>Workspace</SectionLabel>
        <NavLink
          href="/"
          label="Overview"
          isActive={(p) => p === "/"}
        />

        <SectionLabel>Categories</SectionLabel>
        {categories.map((c) => (
          <NavLink
            key={c.category}
            href={`/categories/${encodeURIComponent(c.category)}`}
            label={c.category}
            count={c.count}
            isActive={(p) =>
              p === `/categories/${encodeURIComponent(c.category)}`
            }
          />
        ))}

        <SectionLabel>Analysis</SectionLabel>
        <NavLink href="/compare" label="Compare" disabled isActive={() => false} />
        <NavLink href="/scatter" label="Scatter" disabled isActive={() => false} />
        <NavLink
          href="/distribution"
          label="Distribution"
          disabled
          isActive={() => false}
        />

        {isAdmin && (
          <>
            <SectionLabel>Admin</SectionLabel>
            <NavLink
              href="/formulas"
              label="Formulas"
              isActive={(p) => p === "/formulas"}
            />
            <NavLink
              href="/upload"
              label="Upload"
              isActive={(p) => p === "/upload"}
            />
          </>
        )}
      </nav>

      {/* User footer */}
      {user && (
        <div className="px-3 py-3 border-t border-[var(--border-subtle)]">
          <div className="text-xs text-[var(--text-tertiary)] truncate">
            {user.email}
          </div>
          <button
            onClick={signOut}
            className="mt-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 6.2: Verify in browser**

```bash
npm run dev
```

At http://localhost:3000/:
- Sidebar shows Oak Bridge brand with the gold underscore mark
- "Workspace > Overview" is highlighted
- "Categories" section lists all categories with counts on the right
- "Analysis" section shows Compare/Scatter/Distribution as disabled with "Soon"
- If signed in as admin, Admin section appears at bottom
- User email + Sign out at the very bottom

- [ ] **Step 6.3: Commit**

```bash
git add frontend/components/shell/sidebar.tsx
git commit -m "Build full sidebar with categories, analysis, admin sections"
```

---

### Task 7: Build the `<TopBar>` shell + breadcrumb

**Files:**
- Modify: `frontend/components/shell/top-bar.tsx`
- Create: `frontend/components/shell/fund-search.tsx` (stub for now)

- [ ] **Step 7.1: Create a stub `fund-search.tsx`**

```tsx
"use client";

import { Input } from "@/components/ui/input";

export function FundSearch() {
  return (
    <Input
      type="text"
      placeholder="Search by ticker..."
      className="h-8 w-48 text-sm"
      disabled
    />
  );
}
```

We'll wire this in Task 13.

- [ ] **Step 7.2: Implement `<TopBar>` with breadcrumb**

Replace `frontend/components/shell/top-bar.tsx`:

```tsx
import Link from "next/link";
import { headers } from "next/headers";
import { FundSearch } from "./fund-search";

interface Crumb {
  label: string;
  href?: string;
}

function parseCrumbs(pathname: string): Crumb[] {
  if (pathname === "/" || pathname === "") {
    return [{ label: "Overview" }];
  }

  const parts = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];

  if (parts[0] === "categories" && parts[1]) {
    crumbs.push({ label: "Categories", href: "/" });
    crumbs.push({
      label: decodeURIComponent(parts[1]),
      href: `/categories/${parts[1]}`,
    });
  } else if (parts[0] === "funds" && parts[1]) {
    crumbs.push({ label: "Funds", href: "/" });
    crumbs.push({ label: decodeURIComponent(parts[1]) });
  } else if (parts[0] === "compare") {
    crumbs.push({ label: "Compare" });
  } else if (parts[0] === "scatter") {
    crumbs.push({ label: "Scatter" });
  } else if (parts[0] === "distribution") {
    crumbs.push({ label: "Distribution" });
  } else if (parts[0] === "formulas") {
    crumbs.push({ label: "Formulas" });
  } else if (parts[0] === "upload") {
    crumbs.push({ label: "Upload" });
  } else {
    crumbs.push({ label: parts[0] });
  }

  return crumbs;
}

export async function TopBar() {
  const hdrs = await headers();
  // Next.js exposes the resolved pathname via this internal header in app router
  // builds; fall back to "/" if absent so the bar still renders.
  const pathname = hdrs.get("x-invoke-path") ?? hdrs.get("x-pathname") ?? "/";
  const crumbs = parseCrumbs(pathname);

  return (
    <header className="h-11 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-card)] flex items-center px-4 gap-3">
      <nav className="flex items-center gap-1.5 text-sm min-w-0" aria-label="Breadcrumb">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && (
                <span className="text-[var(--text-quaternary)]">/</span>
              )}
              {c.href && !isLast ? (
                <Link
                  href={c.href}
                  className="text-[var(--text-secondary)] no-underline hover:text-[var(--text-primary)] truncate"
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  className={`truncate ${
                    isLast
                      ? "text-[var(--text-primary)] font-medium"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {c.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>
      <div className="flex-1" />
      <FundSearch />
    </header>
  );
}
```

> If `x-invoke-path` and `x-pathname` are both absent in this Next.js version (verify by adding `console.log([...hdrs.keys()])` once during dev), fall back to making `<TopBar>` a client component that reads `usePathname()`. Convert by adding `"use client"` at top, removing the `await headers()` calls, and replacing with `const pathname = usePathname()`.

- [ ] **Step 7.3: Verify in browser**

```bash
npm run dev
```

- At `/` → breadcrumb reads "Overview"
- At `/categories/Large%20Blend` → "Categories / Large Blend" with "Categories" linking to `/`
- Search input on the right (disabled for now)

If the breadcrumb shows "Overview" everywhere, the header-based pathname read isn't working — convert `<TopBar>` to a client component using `usePathname()` per the note above.

- [ ] **Step 7.4: Commit**

```bash
git add frontend/components/shell/top-bar.tsx frontend/components/shell/fund-search.tsx
git commit -m "Build TopBar with breadcrumb and fund-search slot"
```

---

### Task 8: Migrate existing pages into `(workbench)` group

**Files:**
- Move: `frontend/app/fund/[ticker]/page.tsx` → `frontend/app/(workbench)/funds/[ticker]/page.tsx`
- Move: `frontend/app/formulas/page.tsx` → `frontend/app/(workbench)/formulas/page.tsx`
- Move: `frontend/app/upload/page.tsx` → `frontend/app/(workbench)/upload/page.tsx`
- Move: `frontend/app/rankings/[category]/page.tsx` → `frontend/app/(workbench)/categories/[category]/page.tsx`
- Delete: `frontend/app/funds/page.tsx` (legacy, after verification)
- Delete: `frontend/components/nav-header.tsx`

> Reasoning: rename `fund/` → `funds/[ticker]/` so URLs match the singular plural we documented (`/funds/[ticker]`). Rename `rankings/[category]` → `categories/[category]` per spec.

- [ ] **Step 8.1: Move fund detail page**

```bash
mkdir -p frontend/app/\(workbench\)/funds/\[ticker\]
git mv frontend/app/fund/\[ticker\]/page.tsx frontend/app/\(workbench\)/funds/\[ticker\]/page.tsx
rmdir frontend/app/fund/\[ticker\] frontend/app/fund
```

- [ ] **Step 8.2: Move formulas page**

```bash
mkdir -p frontend/app/\(workbench\)/formulas
git mv frontend/app/formulas/page.tsx frontend/app/\(workbench\)/formulas/page.tsx
rmdir frontend/app/formulas
```

- [ ] **Step 8.3: Move upload page**

```bash
mkdir -p frontend/app/\(workbench\)/upload
git mv frontend/app/upload/page.tsx frontend/app/\(workbench\)/upload/page.tsx
rmdir frontend/app/upload
```

- [ ] **Step 8.4: Move rankings/[category] page to categories/[category]**

```bash
mkdir -p frontend/app/\(workbench\)/categories/\[category\]
git mv frontend/app/rankings/\[category\]/page.tsx frontend/app/\(workbench\)/categories/\[category\]/page.tsx
rmdir frontend/app/rankings/\[category\] frontend/app/rankings
```

- [ ] **Step 8.5: Delete legacy `nav-header.tsx`**

```bash
git rm frontend/components/nav-header.tsx
```

- [ ] **Step 8.6: Update internal links**

Some files still link to `/fund/<ticker>` or `/rankings/<category>`. Find and replace:

```bash
cd frontend
grep -rn '"/fund/' app components lib
grep -rn '"/rankings/' app components lib
```

Update each occurrence:
- `/fund/...` → `/funds/...`
- `/rankings/...` → `/categories/...`

Likely files based on current code: `(workbench)/categories/[category]/page.tsx` (links to fund detail) and `(workbench)/funds/[ticker]/page.tsx` (back-link to category).

- [ ] **Step 8.7: Verify in browser**

```bash
npm run dev
```

- Visit `/` → overview placeholder + sidebar + topbar
- Click a category in the sidebar → old rankings table renders inside the new shell
- Click a fund ticker → fund detail renders inside the new shell
- If admin: visit `/formulas`, `/upload` → render inside new shell
- Sign out from sidebar footer → returns to login

- [ ] **Step 8.8: Verify `/funds/page.tsx` is unreferenced before deleting**

```bash
cd frontend
grep -rn '"/funds"' app components lib
```

If only the existing nav-header reference (already deleted) shows up, delete:

```bash
git rm frontend/app/funds/page.tsx
rmdir frontend/app/funds 2>/dev/null || true
```

If something else still references `/funds`, route those links to `/` (overview) instead, then delete.

- [ ] **Step 8.9: Commit**

```bash
git add -A frontend/app frontend/components
git commit -m "Migrate pages into (workbench) group; rename rankings→categories, fund→funds"
```

---

### Task 9: Wire up `<FundSearch>` typeahead

**Files:**
- Create: `frontend/app/api/funds/search/route.ts`
- Modify: `frontend/components/shell/fund-search.tsx`

- [ ] **Step 9.1: Create `/api/funds/search` route handler**

```ts
// frontend/app/api/funds/search/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 1) return NextResponse.json({ results: [] });

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

- [ ] **Step 9.2: Implement the typeahead UI**

Replace `frontend/components/shell/fund-search.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

interface SearchResult {
  ticker: string;
  name: string;
  category: string;
}

export function FundSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/funds/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        // aborted or network error — ignore
      }
    }, 150);
    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  function go(ticker: string) {
    setOpen(false);
    setQuery("");
    router.push(`/funds/${encodeURIComponent(ticker)}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        type="text"
        placeholder="Search ticker..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) go(results[0].ticker);
          if (e.key === "Escape") setOpen(false);
        }}
        className="h-8 w-56 text-sm font-mono"
      />
      {open && results.length > 0 && (
        <div className="absolute right-0 top-9 w-72 max-h-72 overflow-y-auto rounded-md border border-[var(--border-default)] bg-[var(--surface-card)] shadow-sm z-50">
          {results.map((r) => (
            <button
              key={r.ticker}
              onClick={() => go(r.ticker)}
              className="w-full text-left px-3 py-2 hover:bg-[var(--surface-muted)] border-b border-[var(--border-subtle)] last:border-b-0"
            >
              <div className="font-mono text-sm font-medium text-[var(--text-primary)]">
                {r.ticker}
              </div>
              <div className="text-xs text-[var(--text-tertiary)] truncate">
                {r.name} · {r.category}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 9.3: Verify in browser**

```bash
npm run dev
```

Type a partial ticker (e.g., "VFI") in the topbar search. Dropdown should show matching funds. Press Enter or click → navigates to that fund's detail page.

- [ ] **Step 9.4: Commit**

```bash
git add frontend/app/api/funds/search frontend/components/shell/fund-search.tsx
git commit -m "Add fund-search typeahead with /api/funds/search endpoint"
```

---

## Phase 3 — Data helpers

### Task 10: Add `getOverviewKpis()`

**Files:**
- Modify: `frontend/lib/queries.ts`

- [ ] **Step 10.1: Append the helper to `lib/queries.ts`**

```ts
export interface OverviewKpis {
  totalFunds: number;
  categoryCount: number;
  avgGpaScore: number;
  pctScoringSeventyOrAbove: number;
  asOfDate: string | null;
}

export async function getOverviewKpis(): Promise<OverviewKpis> {
  const date = await resolveAsOfDate(null);
  if (!date) {
    return {
      totalFunds: 0,
      categoryCount: 0,
      avgGpaScore: 0,
      pctScoringSeventyOrAbove: 0,
      asOfDate: null,
    };
  }

  const { data, error } = await supabase
    .from("fund_rankings")
    .select("total_gpa_score, funds!inner(category)")
    .eq("as_of_date", date)
    .limit(MAX_ROWS);
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const total = rows.length;
  const categories = new Set<string>();
  let scoreSum = 0;
  let scoreSeventy = 0;
  for (const r of rows) {
    const score = (r.total_gpa_score ?? 0) as number;
    scoreSum += score;
    if (score >= 70) scoreSeventy += 1;
    // funds!inner(category) returns the joined row as an object in supabase-js
    const cat = (r as { funds: { category: string } | null }).funds?.category;
    if (cat) categories.add(cat);
  }

  return {
    totalFunds: total,
    categoryCount: categories.size,
    avgGpaScore: total > 0 ? scoreSum / total : 0,
    pctScoringSeventyOrAbove: total > 0 ? (scoreSeventy / total) * 100 : 0,
    asOfDate: date,
  };
}
```

- [ ] **Step 10.2: Smoke-test via a temporary console log**

Edit `frontend/app/(workbench)/page.tsx` (the placeholder) and add:

```tsx
import { getOverviewKpis } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function OverviewPlaceholder() {
  const kpis = await getOverviewKpis();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Overview (placeholder)</h1>
      <pre className="mt-4 text-xs">{JSON.stringify(kpis, null, 2)}</pre>
    </div>
  );
}
```

```bash
npm run dev
```

Visit `/` → confirm KPI numbers look plausible (totalFunds matches your data, categoryCount matches sidebar count, avgGpaScore between 0–100).

- [ ] **Step 10.3: Commit**

```bash
git add frontend/lib/queries.ts frontend/app/\(workbench\)/page.tsx
git commit -m "Add getOverviewKpis data helper and verify on home page"
```

---

### Task 11: Add `getAllFundsForScatter()`

**Files:**
- Modify: `frontend/lib/queries.ts`

- [ ] **Step 11.1: Append the helper**

```ts
export interface FundScatterRow {
  ticker: string;
  name: string;
  category: string;
  riskScore: number;
  returnScore: number;
  totalGpaScore: number;
  marketCapScore: number;
}

export async function getAllFundsForScatter(): Promise<FundScatterRow[]> {
  const date = await resolveAsOfDate(null);
  if (!date) return [];

  const { data, error } = await supabase
    .from("fund_rankings")
    .select(
      `ticker,
       risk_score,
       return_score,
       total_gpa_score,
       market_cap_score,
       funds!inner(name, category)`
    )
    .eq("as_of_date", date)
    .limit(MAX_ROWS);
  if (error) throw new Error(error.message);

  type Row = {
    ticker: string;
    risk_score: number | null;
    return_score: number | null;
    total_gpa_score: number | null;
    market_cap_score: number | null;
    funds: { name: string; category: string } | null;
  };

  return (data as Row[] | null ?? []).map((r) => ({
    ticker: r.ticker,
    name: r.funds?.name ?? r.ticker,
    category: r.funds?.category ?? "",
    riskScore: r.risk_score ?? 0,
    returnScore: r.return_score ?? 0,
    totalGpaScore: r.total_gpa_score ?? 0,
    marketCapScore: r.market_cap_score ?? 0,
  }));
}
```

- [ ] **Step 11.2: Smoke-test**

Add a second log to the placeholder home page:

```tsx
import { getOverviewKpis, getAllFundsForScatter } from "@/lib/queries";
// ...
const [kpis, scatter] = await Promise.all([
  getOverviewKpis(),
  getAllFundsForScatter(),
]);
return (
  <div className="p-8">
    <h1 className="text-2xl font-semibold">Overview (placeholder)</h1>
    <p className="mt-2 text-sm">{scatter.length} scatter rows loaded</p>
    <pre className="mt-4 text-xs">{JSON.stringify(kpis, null, 2)}</pre>
  </div>
);
```

```bash
npm run dev
```

Confirm scatter row count matches totalFunds.

- [ ] **Step 11.3: Commit**

```bash
git add frontend/lib/queries.ts frontend/app/\(workbench\)/page.tsx
git commit -m "Add getAllFundsForScatter data helper"
```

---

### Task 12: Add `getFundPeerStats()`

**Files:**
- Modify: `frontend/lib/queries.ts`

- [ ] **Step 12.1: Append the helper**

```ts
export interface PeerMetric {
  label: string;
  fundValue: number;
  categoryAverage: number;
}

export interface FundPeerStats {
  ticker: string;
  category: string;
  metrics: PeerMetric[];
}

export async function getFundPeerStats(
  ticker: string
): Promise<FundPeerStats | null> {
  const date = await resolveAsOfDate(null, ticker);
  if (!date) return null;

  const { data: fund } = await supabase
    .from("funds")
    .select("ticker, category")
    .ilike("ticker", ticker)
    .single();
  if (!fund) return null;

  const { data, error } = await supabase
    .from("fund_rankings")
    .select(
      `ticker,
       risk_score,
       return_score,
       market_cap_score,
       turnover_score,
       total_gpa_score,
       funds!inner(category)`
    )
    .eq("as_of_date", date)
    .eq("funds.category", fund.category)
    .limit(MAX_ROWS);
  if (error) throw new Error(error.message);

  type Row = {
    ticker: string;
    risk_score: number | null;
    return_score: number | null;
    market_cap_score: number | null;
    turnover_score: number | null;
    total_gpa_score: number | null;
  };

  const rows = (data as Row[] | null) ?? [];
  const me = rows.find((r) => r.ticker === fund.ticker);
  if (!me) return null;

  const avg = (key: keyof Row): number => {
    const vals = rows
      .map((r) => r[key])
      .filter((v): v is number => typeof v === "number");
    if (vals.length === 0) return 0;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  };

  const metrics: PeerMetric[] = [
    {
      label: "Risk",
      fundValue: me.risk_score ?? 0,
      categoryAverage: avg("risk_score"),
    },
    {
      label: "Return",
      fundValue: me.return_score ?? 0,
      categoryAverage: avg("return_score"),
    },
    {
      label: "Market Cap",
      fundValue: me.market_cap_score ?? 0,
      categoryAverage: avg("market_cap_score"),
    },
    {
      label: "Turnover",
      fundValue: me.turnover_score ?? 0,
      categoryAverage: avg("turnover_score"),
    },
    {
      label: "GPA",
      fundValue: me.total_gpa_score ?? 0,
      categoryAverage: avg("total_gpa_score"),
    },
  ];

  return { ticker: fund.ticker, category: fund.category, metrics };
}
```

- [ ] **Step 12.2: Smoke-test from browser DevTools**

```bash
npm run dev
```

In DevTools console at `/`:

```js
fetch("/api/funds/search?q=V").then((r) => r.json()).then(console.log);
```

Pick a ticker from the response, then verify the page renders peer stats indirectly later when the panel is built. (No standalone endpoint for peer stats; it's used server-side only.)

- [ ] **Step 12.3: Commit**

```bash
git add frontend/lib/queries.ts
git commit -m "Add getFundPeerStats data helper for vs-peers comparison"
```

---

## Phase 4 — Overview page

### Task 13: Build `<KpiStrip>`

**Files:**
- Create: `frontend/components/overview/kpi-strip.tsx`

- [ ] **Step 13.1: Implement the component**

```tsx
import type { OverviewKpis } from "@/lib/queries";
import { Card } from "@/components/ui/card";

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
}

function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <Card className="p-4 border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-none">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">
        {label}
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-xs text-[var(--text-tertiary)]">{hint}</div>
      )}
    </Card>
  );
}

export function KpiStrip({ kpis }: { kpis: OverviewKpis }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="Total Funds" value={kpis.totalFunds.toLocaleString()} />
      <KpiCard label="Categories" value={kpis.categoryCount.toString()} />
      <KpiCard
        label="Avg GPA Score"
        value={kpis.avgGpaScore.toFixed(1)}
        hint="of 100"
      />
      <KpiCard
        label="Scoring 70+"
        value={`${kpis.pctScoringSeventyOrAbove.toFixed(0)}%`}
      />
    </div>
  );
}
```

- [ ] **Step 13.2: Render it on the home page (replacing the placeholder)**

Replace `frontend/app/(workbench)/page.tsx`:

```tsx
import { getOverviewKpis } from "@/lib/queries";
import { KpiStrip } from "@/components/overview/kpi-strip";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const kpis = await getOverviewKpis();
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-0.5 text-sm text-[var(--text-tertiary)]">
          Cross-category snapshot of the current rankings.
        </p>
      </header>
      <KpiStrip kpis={kpis} />
    </div>
  );
}
```

- [ ] **Step 13.3: Verify in browser**

Visit `/` — see four KPI cards with values pulled from real data. Numbers in JetBrains Mono with tabular-nums.

- [ ] **Step 13.4: Commit**

```bash
git add frontend/components/overview/kpi-strip.tsx frontend/app/\(workbench\)/page.tsx
git commit -m "Build KPI strip on overview page"
```

---

### Task 14: Build `<RiskReturnScatter>`

**Files:**
- Create: `frontend/components/overview/risk-return-scatter.tsx`

- [ ] **Step 14.1: Implement the component**

```tsx
"use client";

import { AgCharts } from "ag-charts-react";
import type { AgChartOptions } from "ag-charts-community";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { FundScatterRow } from "@/lib/queries";

const CATEGORY_COLORS = [
  "#0d1f33",
  "#15803d",
  "#a16207",
  "#b91c1c",
  "#5b21b6",
  "#0f766e",
  "#9333ea",
  "#c2410c",
];

function colorForCategory(cat: string, index: Map<string, number>): string {
  let i = index.get(cat);
  if (i === undefined) {
    i = index.size % CATEGORY_COLORS.length;
    index.set(cat, i);
  }
  return CATEGORY_COLORS[i];
}

export function RiskReturnScatter({ rows }: { rows: FundScatterRow[] }) {
  const router = useRouter();

  const options = useMemo<AgChartOptions>(() => {
    const colorIndex = new Map<string, number>();
    const seriesByCategory = new Map<string, FundScatterRow[]>();
    for (const r of rows) {
      const list = seriesByCategory.get(r.category) ?? [];
      list.push(r);
      seriesByCategory.set(r.category, list);
    }

    return {
      data: rows,
      title: undefined,
      background: { fill: "transparent" },
      legend: { position: "bottom", spacing: 16 },
      axes: [
        {
          type: "number",
          position: "bottom",
          title: { text: "Risk Score", color: "#737373" },
          min: 0,
          max: 100,
        },
        {
          type: "number",
          position: "left",
          title: { text: "Return Score", color: "#737373" },
          min: 0,
          max: 100,
        },
      ],
      series: Array.from(seriesByCategory.entries()).map(([cat, items]) => ({
        type: "scatter",
        data: items,
        xKey: "riskScore",
        yKey: "returnScore",
        sizeKey: "marketCapScore",
        sizeName: "Market Cap",
        title: cat,
        marker: {
          fill: colorForCategory(cat, colorIndex),
          fillOpacity: 0.65,
          strokeWidth: 0,
        },
        tooltip: {
          renderer: ({ datum }: { datum: FundScatterRow }) => ({
            heading: datum.ticker,
            content: `${datum.name}<br/>Risk ${datum.riskScore.toFixed(
              1
            )} · Return ${datum.returnScore.toFixed(
              1
            )}<br/>GPA ${datum.totalGpaScore.toFixed(1)}`,
          }),
        },
        listeners: {
          nodeClick: (event: { datum: FundScatterRow }) => {
            const cat = encodeURIComponent(event.datum.category);
            const tic = encodeURIComponent(event.datum.ticker);
            router.push(`/categories/${cat}?fund=${tic}`);
          },
        },
      })),
    };
  }, [rows, router]);

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Risk vs Return — All Funds
      </h2>
      <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
        Bubble size reflects market-cap score. Click a point to inspect the fund.
      </p>
      <div className="h-[420px] mt-3">
        <AgCharts options={options} />
      </div>
    </div>
  );
}
```

> AG Charts Community supports the `scatter` series and `sizeKey`. If a TypeScript error appears on `listeners.nodeClick`, cast the event signature to `any` *with an inline justification comment* explaining AG Charts' loose typing on event handlers.

- [ ] **Step 14.2: Render it on the overview page**

Update `frontend/app/(workbench)/page.tsx`:

```tsx
import { getOverviewKpis, getAllFundsForScatter } from "@/lib/queries";
import { KpiStrip } from "@/components/overview/kpi-strip";
import { RiskReturnScatter } from "@/components/overview/risk-return-scatter";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [kpis, scatter] = await Promise.all([
    getOverviewKpis(),
    getAllFundsForScatter(),
  ]);
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-0.5 text-sm text-[var(--text-tertiary)]">
          Cross-category snapshot of the current rankings.
        </p>
      </header>
      <KpiStrip kpis={kpis} />
      <RiskReturnScatter rows={scatter} />
    </div>
  );
}
```

- [ ] **Step 14.3: Verify in browser**

`/` → scatter plot renders below KPIs. Hovering shows ticker + scores. Clicking a point navigates to `/categories/<cat>?fund=<ticker>`. (The category page won't render the panel yet — that's Task 19.)

- [ ] **Step 14.4: Commit**

```bash
git add frontend/components/overview/risk-return-scatter.tsx frontend/app/\(workbench\)/page.tsx
git commit -m "Build risk-return scatter on overview page"
```

---

### Task 15: Build `<HighestPerCategory>`

**Files:**
- Create: `frontend/components/overview/highest-per-category.tsx`
- Modify: `frontend/lib/queries.ts` (add `getHighestPerCategory`)

- [ ] **Step 15.1: Add the data helper**

Append to `lib/queries.ts`:

```ts
export interface HighestPerCategoryRow {
  category: string;
  ticker: string;
  name: string;
  totalGpaScore: number;
}

export async function getHighestPerCategory(): Promise<HighestPerCategoryRow[]> {
  const date = await resolveAsOfDate(null);
  if (!date) return [];

  const { data, error } = await supabase
    .from("fund_rankings")
    .select(
      `ticker,
       category_rank,
       total_gpa_score,
       funds!inner(name, category)`
    )
    .eq("as_of_date", date)
    .eq("category_rank", 1)
    .limit(MAX_ROWS);
  if (error) throw new Error(error.message);

  type Row = {
    ticker: string;
    total_gpa_score: number | null;
    funds: { name: string; category: string } | null;
  };

  return ((data as Row[] | null) ?? [])
    .filter((r) => r.funds)
    .map((r) => ({
      category: r.funds!.category,
      ticker: r.ticker,
      name: r.funds!.name,
      totalGpaScore: r.total_gpa_score ?? 0,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}
```

- [ ] **Step 15.2: Build the component**

```tsx
// frontend/components/overview/highest-per-category.tsx
import Link from "next/link";
import type { HighestPerCategoryRow } from "@/lib/queries";
import { scoreColorVar } from "@/lib/score-color";

export function HighestPerCategory({
  rows,
}: {
  rows: HighestPerCategoryRow[];
}) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Highest-scoring per category
      </h2>
      <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
        Top-ranked fund per category by current GPA. Decision-support reference
        only.
      </p>
      <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
        {rows.map((r) => {
          const pct = Math.min(100, Math.max(0, r.totalGpaScore));
          const color = scoreColorVar(r.totalGpaScore);
          return (
            <li key={r.category}>
              <Link
                href={`/categories/${encodeURIComponent(r.category)}?fund=${encodeURIComponent(r.ticker)}`}
                className="flex items-center gap-3 py-2 no-underline hover:bg-[var(--surface-muted)] -mx-2 px-2 rounded transition-colors"
              >
                <div className="w-32 text-xs text-[var(--text-secondary)] truncate">
                  {r.category}
                </div>
                <div className="font-mono text-xs text-[var(--text-primary)] w-16">
                  {r.ticker}
                </div>
                <div className="flex-1 min-w-0 text-xs text-[var(--text-tertiary)] truncate">
                  {r.name}
                </div>
                <div className="w-32 h-1.5 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                  <div
                    className="h-full"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
                <div
                  className="font-mono text-xs font-semibold tabular-nums w-12 text-right"
                  style={{ color }}
                >
                  {r.totalGpaScore.toFixed(1)}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 15.3: Render on overview page**

Update `frontend/app/(workbench)/page.tsx`:

```tsx
import {
  getOverviewKpis,
  getAllFundsForScatter,
  getHighestPerCategory,
} from "@/lib/queries";
import { KpiStrip } from "@/components/overview/kpi-strip";
import { RiskReturnScatter } from "@/components/overview/risk-return-scatter";
import { HighestPerCategory } from "@/components/overview/highest-per-category";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [kpis, scatter, highest] = await Promise.all([
    getOverviewKpis(),
    getAllFundsForScatter(),
    getHighestPerCategory(),
  ]);
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-0.5 text-sm text-[var(--text-tertiary)]">
          Cross-category snapshot of the current rankings.
        </p>
      </header>
      <KpiStrip kpis={kpis} />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <RiskReturnScatter rows={scatter} />
        </div>
        <div className="lg:col-span-2">
          <HighestPerCategory rows={highest} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 15.4: Verify in browser**

`/` → KPI row, scatter (left, 60% width), highest-per-category list (right, 40% width). Each list row links to `/categories/<cat>?fund=<ticker>`.

- [ ] **Step 15.5: Commit**

```bash
git add frontend/components/overview/highest-per-category.tsx frontend/lib/queries.ts frontend/app/\(workbench\)/page.tsx
git commit -m "Build highest-per-category list on overview page"
```

---

## Phase 5 — Category workbench

### Task 16: Promote `<ScoreBar>` to a shared component

**Files:**
- Create: `frontend/components/score-bar.tsx`
- Modify: `frontend/app/(workbench)/funds/[ticker]/page.tsx`

- [ ] **Step 16.1: Create shared `<ScoreBar>`**

```tsx
// frontend/components/score-bar.tsx
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
```

- [ ] **Step 16.2: Update fund detail page to import the shared one**

In `frontend/app/(workbench)/funds/[ticker]/page.tsx`:
- Delete the local `function ScoreBar(...)` definition.
- Add `import { ScoreBar } from "@/components/score-bar";` at the top.
- All existing JSX usages of `<ScoreBar ... />` continue to work.

- [ ] **Step 16.3: Verify in browser**

Visit `/funds/<some-ticker>` → score bars render identically. Colors match new tokens.

- [ ] **Step 16.4: Commit**

```bash
git add frontend/components/score-bar.tsx frontend/app/\(workbench\)/funds
git commit -m "Promote ScoreBar to shared component"
```

---

### Task 17: Build `<RankingsGrid>` (AG Grid)

**Files:**
- Create: `frontend/components/workbench/rankings-grid.tsx`

- [ ] **Step 17.1: Implement the grid**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import type {
  ColDef,
  GridReadyEvent,
  RowSelectedEvent,
  ValueFormatterParams,
} from "ag-grid-community";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { scoreColorVar } from "@/lib/score-color";

ModuleRegistry.registerModules([AllCommunityModule]);

export interface RankingRow {
  rank: number;
  ticker: string;
  name: string;
  totalGpaScore: number;
  riskScore: number;
  returnScore: number;
  marketCapScore: number;
  turnoverScore: number;
}

function scoreCellRenderer(params: ValueFormatterParams<RankingRow, number>) {
  const v = params.value;
  if (typeof v !== "number") return "";
  return v.toFixed(1);
}

function ScoreCell(props: { value: number }) {
  return (
    <span
      className="font-mono tabular-nums font-medium"
      style={{ color: scoreColorVar(props.value) }}
    >
      {props.value.toFixed(2)}
    </span>
  );
}

export function RankingsGrid({
  rows,
  category,
}: {
  rows: RankingRow[];
  category: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTicker = searchParams.get("fund");
  const [api, setApi] = useState<GridReadyEvent["api"] | null>(null);

  const columns = useMemo<ColDef<RankingRow>[]>(
    () => [
      {
        headerName: "#",
        field: "rank",
        width: 70,
        cellClass: "font-mono tabular-nums",
      },
      {
        headerName: "Ticker",
        field: "ticker",
        width: 100,
        cellClass: "font-mono font-medium",
      },
      { headerName: "Name", field: "name", flex: 1, minWidth: 220 },
      {
        headerName: "GPA",
        field: "totalGpaScore",
        width: 90,
        valueFormatter: scoreCellRenderer,
        cellRenderer: (p: { value: number }) => <ScoreCell value={p.value} />,
        type: "rightAligned",
      },
      {
        headerName: "Risk",
        field: "riskScore",
        width: 90,
        valueFormatter: scoreCellRenderer,
        cellRenderer: (p: { value: number }) => <ScoreCell value={p.value} />,
        type: "rightAligned",
      },
      {
        headerName: "Return",
        field: "returnScore",
        width: 90,
        valueFormatter: scoreCellRenderer,
        cellRenderer: (p: { value: number }) => <ScoreCell value={p.value} />,
        type: "rightAligned",
      },
      {
        headerName: "Mkt Cap",
        field: "marketCapScore",
        width: 100,
        valueFormatter: scoreCellRenderer,
        cellRenderer: (p: { value: number }) => <ScoreCell value={p.value} />,
        type: "rightAligned",
      },
      {
        headerName: "Turnover",
        field: "turnoverScore",
        width: 100,
        valueFormatter: scoreCellRenderer,
        cellRenderer: (p: { value: number }) => <ScoreCell value={p.value} />,
        type: "rightAligned",
      },
    ],
    []
  );

  useEffect(() => {
    if (!api || !selectedTicker) return;
    const node = api.getRowNode(selectedTicker);
    if (node) {
      node.setSelected(true, true);
      api.ensureNodeVisible(node, "middle");
    }
  }, [api, selectedTicker]);

  function onRowSelected(e: RowSelectedEvent<RankingRow>) {
    if (!e.node.isSelected()) return;
    const t = e.data?.ticker;
    if (!t) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("fund", t);
    router.replace(
      `/categories/${encodeURIComponent(category)}?${params.toString()}`,
      { scroll: false }
    );
  }

  return (
    <div className="ag-theme-quartz h-full" style={{ height: "100%" }}>
      <AgGridReact<RankingRow>
        rowData={rows}
        columnDefs={columns}
        rowSelection="single"
        getRowId={(params) => params.data.ticker}
        onGridReady={(e) => setApi(e.api)}
        onRowSelected={onRowSelected}
        suppressCellFocus
        animateRows
        rowHeight={32}
        headerHeight={32}
      />
    </div>
  );
}
```

> If the project's AG Grid version uses an older module API and `AllCommunityModule` is unavailable, fall back to importing `ModuleRegistry` and the specific modules per `ag-grid-react` v35 docs at `frontend/node_modules/ag-grid-community/dist/styles/ag-theme-quartz.css` (verify path).

- [ ] **Step 17.2: Smoke check at next task**

This component is rendered in Task 19. No standalone verification step here.

- [ ] **Step 17.3: Commit**

```bash
git add frontend/components/workbench/rankings-grid.tsx
git commit -m "Build RankingsGrid (AG Grid) with URL-driven selection"
```

---

### Task 18: Build `<FundDetailPanel>` and its subcomponents

**Files:**
- Create: `frontend/components/workbench/fund-detail-panel.tsx`
- Create: `frontend/components/workbench/empty-detail.tsx`
- Create: `frontend/components/workbench/peer-comparison-chart.tsx`
- Create: `frontend/components/workbench/market-data-placeholder.tsx`

- [ ] **Step 18.1: Build `<EmptyDetail>`**

```tsx
// frontend/components/workbench/empty-detail.tsx
export function EmptyDetail() {
  return (
    <div className="p-6 h-full flex flex-col items-center justify-center text-center">
      <div className="text-sm font-medium text-[var(--text-secondary)]">
        Select a fund
      </div>
      <p className="mt-1 text-xs text-[var(--text-tertiary)] max-w-[200px]">
        Click a row in the table to inspect score breakdowns and peer comparison.
      </p>
    </div>
  );
}
```

- [ ] **Step 18.2: Build `<MarketDataPlaceholder>`**

```tsx
// frontend/components/workbench/market-data-placeholder.tsx
export function MarketDataPlaceholder() {
  return (
    <div className="rounded-md border border-dashed border-[var(--border-default)] p-4 text-xs text-[var(--text-tertiary)]">
      <div className="font-medium text-[var(--text-secondary)] mb-1">
        Market data
      </div>
      Marketplace API integration is not yet wired. This panel will show price,
      AUM, expense ratio, and yield once connected.
    </div>
  );
}
```

- [ ] **Step 18.3: Build `<PeerComparisonChart>`**

```tsx
// frontend/components/workbench/peer-comparison-chart.tsx
"use client";

import { AgCharts } from "ag-charts-react";
import type { AgChartOptions } from "ag-charts-community";
import type { PeerMetric } from "@/lib/queries";
import { useMemo } from "react";

export function PeerComparisonChart({ metrics }: { metrics: PeerMetric[] }) {
  const options = useMemo<AgChartOptions>(
    () => ({
      data: metrics,
      background: { fill: "transparent" },
      legend: { position: "bottom" },
      series: [
        {
          type: "bar",
          direction: "horizontal",
          xKey: "label",
          yKey: "fundValue",
          yName: "This fund",
          fill: "#0d1f33",
        },
        {
          type: "bar",
          direction: "horizontal",
          xKey: "label",
          yKey: "categoryAverage",
          yName: "Category avg",
          fill: "#a3a3a3",
        },
      ],
      axes: [
        { type: "category", position: "left" },
        { type: "number", position: "bottom", min: 0, max: 100 },
      ],
    }),
    [metrics]
  );

  return (
    <div className="h-[260px]">
      <AgCharts options={options} />
    </div>
  );
}
```

- [ ] **Step 18.4: Build `<FundDetailPanel>`**

```tsx
// frontend/components/workbench/fund-detail-panel.tsx
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreBar } from "@/components/score-bar";
import { scoreColorVar } from "@/lib/score-color";
import { getFundDetail, getFundPeerStats } from "@/lib/queries";
import { PeerComparisonChart } from "./peer-comparison-chart";
import { MarketDataPlaceholder } from "./market-data-placeholder";

export async function FundDetailPanel({ ticker }: { ticker: string }) {
  const [fund, peer] = await Promise.all([
    getFundDetail(ticker),
    getFundPeerStats(ticker),
  ]);

  if (!fund) {
    return (
      <div className="p-4 text-sm text-[var(--text-tertiary)]">
        Fund &ldquo;{ticker}&rdquo; not found in current rankings.
      </div>
    );
  }

  const totalScore = fund.total_gpa_score ?? 0;

  return (
    <div className="p-4 h-full overflow-auto">
      <header className="mb-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-mono text-lg font-semibold text-[var(--text-primary)]">
            {fund.ticker}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            Rank {fund.rank ?? "—"}
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
            View full detail →
          </Link>
        </TabsContent>

        <TabsContent value="peers" className="mt-4">
          {peer && peer.metrics.length > 0 ? (
            <PeerComparisonChart metrics={peer.metrics} />
          ) : (
            <p className="text-xs text-[var(--text-tertiary)]">
              Peer comparison unavailable for this fund.
            </p>
          )}
        </TabsContent>

        <TabsContent value="market" className="mt-4">
          <MarketDataPlaceholder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 18.5: Verify components compile**

```bash
cd frontend && npx tsc --noEmit
```

Expect zero errors. Browser verification happens in Task 19 after composition.

- [ ] **Step 18.6: Commit**

```bash
git add frontend/components/workbench
git commit -m "Build FundDetailPanel with overview/peers/market tabs"
```

---

### Task 19: Compose the category workbench page

**Files:**
- Modify: `frontend/app/(workbench)/categories/[category]/page.tsx`

> The current file is the old simple-table rankings page (moved in Task 8). Replace its body with the new layout.

- [ ] **Step 19.1: Replace the file contents**

```tsx
import { Suspense } from "react";
import { motion } from "motion/react";
import { getRankingsForCategory } from "@/lib/queries";
import { RankingsGrid, type RankingRow } from "@/components/workbench/rankings-grid";
import { FundDetailPanel } from "@/components/workbench/fund-detail-panel";
import { EmptyDetail } from "@/components/workbench/empty-detail";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ fund?: string }>;
}

export default async function CategoryWorkbenchPage({
  params,
  searchParams,
}: PageProps) {
  const { category: rawCategory } = await params;
  const { fund: selectedFund } = await searchParams;
  const category = decodeURIComponent(rawCategory);
  const result = await getRankingsForCategory(category);

  const rows: RankingRow[] = result.rankings.map((r) => ({
    rank: r.rank,
    ticker: r.ticker,
    name: r.name,
    totalGpaScore: r.total_gpa_score,
    riskScore: r.risk_score,
    returnScore: r.return_score,
    marketCapScore: r.market_cap_score,
    turnoverScore: r.turnover_score,
  }));

  return (
    <div className="h-[calc(100vh-2.75rem)] flex">
      <section className="flex-1 min-w-0 flex flex-col">
        <header className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]">
          <h1 className="text-base font-semibold tracking-tight">{category}</h1>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            {rows.length} funds ranked by Oak Bridge multi-factor GPA — decision
            support only.
          </p>
        </header>
        <div className="flex-1 min-h-0">
          <RankingsGrid rows={rows} category={category} />
        </div>
      </section>
      <aside className="w-80 shrink-0 border-l border-[var(--border-subtle)] bg-[var(--surface-card)]">
        {selectedFund ? (
          <Suspense
            key={selectedFund}
            fallback={<div className="p-4 text-xs">Loading...</div>}
          >
            <PanelMotion key={selectedFund}>
              <FundDetailPanel ticker={selectedFund} />
            </PanelMotion>
          </Suspense>
        ) : (
          <EmptyDetail />
        )}
      </aside>
    </div>
  );
}

// Wraps content in a small fade/slide for the right panel.
function PanelMotion({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}
```

> If `motion/react` import fails: the package may export from `motion` directly — try `import { motion } from "motion";`. The current package's actual export path can be confirmed in `frontend/node_modules/motion/package.json`.

`PanelMotion` is a server-component wrapping a client motion element — Next.js allows that since `motion.div` is itself a client component. If you hit a "use client" error, mark `PanelMotion` as a client component by extracting it to its own file with `"use client"` at the top.

- [ ] **Step 19.2: Verify in browser**

Visit `/categories/<category>`:
- AG Grid renders the ranked funds with score colors.
- Right panel shows "Select a fund" empty state.
- Click a row → URL updates to `?fund=TICKER`, right panel populates with ticker, score, and tabs.
- Tabs switch between Overview, vs Peers, Market.
- Refresh the URL → panel still populated.
- Click "View full detail →" → navigates to `/funds/[ticker]`.

- [ ] **Step 19.3: Commit**

```bash
git add frontend/app/\(workbench\)/categories
git commit -m "Compose category workbench with grid + detail panel"
```

---

## Phase 6 — Fund detail refresh + redirect

### Task 20: Restyle `/funds/[ticker]` page with new tokens

**Files:**
- Modify: `frontend/app/(workbench)/funds/[ticker]/page.tsx`

- [ ] **Step 20.1: Update inline styles to use new tokens**

The page currently uses `var(--card-bg)`, `var(--card-border)`, `var(--accent)`, etc. Find-and-replace within this file:

| Old | New |
|---|---|
| `var(--card-bg)` | `var(--surface-card)` |
| `var(--card-border)` | `var(--border-subtle)` |
| `var(--accent-muted)` | `var(--surface-muted)` |
| `var(--text-muted)` | `var(--text-tertiary)` |
| `var(--accent)` (when used as link/text) | `var(--brand-primary)` |

Also: replace inline color styles for the total GPA score with `scoreColorVar(...)`.

- [ ] **Step 20.2: Update the back-link to point at `/categories/<cat>`**

The existing code has:

```tsx
<Link href={`/rankings/${encodeURIComponent(fund.category)}`} ...
```

Change to `/categories/${encodeURIComponent(fund.category)}`.

Also update the "Fund not found" link from `href="/"` (already correct).

- [ ] **Step 20.3: Verify in browser**

`/funds/<ticker>` → page renders with new tokens. Back-link returns to `/categories/<cat>`. Score colors updated.

- [ ] **Step 20.4: Commit**

```bash
git add frontend/app/\(workbench\)/funds
git commit -m "Restyle fund detail page with new tokens and updated back-link"
```

---

### Task 21: Add `/rankings/:cat` → `/categories/:cat` redirect

**Files:**
- Modify: `frontend/next.config.ts`

- [ ] **Step 21.1: Add redirect**

Replace `frontend/next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/rankings/:category",
        destination: "/categories/:category",
        permanent: true,
      },
      {
        source: "/fund/:ticker",
        destination: "/funds/:ticker",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 21.2: Verify in browser**

Restart dev server (config changes need a fresh boot).

```bash
npm run dev
```

Visit `/rankings/Large%20Blend` → should 308 redirect to `/categories/Large%20Blend`. Visit `/fund/VFIAX` → redirects to `/funds/VFIAX`.

- [ ] **Step 21.3: Commit**

```bash
git add frontend/next.config.ts
git commit -m "Add redirects from legacy /rankings and /fund URLs"
```

---

## Phase 7 — Phase 2 placeholders

### Task 22: Build `<ComingSoonPanel>` and placeholder routes

**Files:**
- Create: `frontend/components/placeholders/coming-soon-panel.tsx`
- Create: `frontend/app/(workbench)/compare/page.tsx`
- Create: `frontend/app/(workbench)/scatter/page.tsx`
- Create: `frontend/app/(workbench)/distribution/page.tsx`

- [ ] **Step 22.1: Build the shared component**

```tsx
// frontend/components/placeholders/coming-soon-panel.tsx
export function ComingSoonPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8">
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-quaternary)] font-medium">
          Coming Soon
        </div>
        <h1 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
          {title}
        </h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 22.2: Create `/compare` page**

```tsx
// frontend/app/(workbench)/compare/page.tsx
import { ComingSoonPanel } from "@/components/placeholders/coming-soon-panel";

export default function ComparePage() {
  return (
    <ComingSoonPanel
      title="Fund Comparison"
      description="Select 2–4 funds from the rankings to compare them side-by-side across all score components, returns, and risk metrics. Unblocks head-to-head analysis without leaving the app."
    />
  );
}
```

- [ ] **Step 22.3: Create `/scatter` page**

```tsx
// frontend/app/(workbench)/scatter/page.tsx
import { ComingSoonPanel } from "@/components/placeholders/coming-soon-panel";

export default function ScatterPage() {
  return (
    <ComingSoonPanel
      title="Efficiency Frontier Explorer"
      description="A full-screen scatter plot with axis selection, category filtering, and metric overlays. Find outliers, spot concentration, and visualise the efficient frontier across any pair of metrics."
    />
  );
}
```

- [ ] **Step 22.4: Create `/distribution` page**

```tsx
// frontend/app/(workbench)/distribution/page.tsx
import { ComingSoonPanel } from "@/components/placeholders/coming-soon-panel";

export default function DistributionPage() {
  return (
    <ComingSoonPanel
      title="Score Distribution"
      description="Histograms and box plots showing how scores are spread within each category. Spot outliers, see the median and quartiles, and identify categories where scoring is bunched vs widely dispersed."
    />
  );
}
```

- [ ] **Step 22.5: Verify in browser**

Visit `/compare`, `/scatter`, `/distribution` → each renders its placeholder with the right title and description. Sidebar items still appear as disabled "Soon" — this is intentional (the placeholder is reachable via direct URL but the nav doesn't link there yet).

- [ ] **Step 22.6: Commit**

```bash
git add frontend/components/placeholders frontend/app/\(workbench\)
git commit -m "Add Phase 2 placeholder pages for compare/scatter/distribution"
```

---

## Phase 8 — Loading + error states

### Task 23: Add `loading.tsx` and `error.tsx` for new routes

**Files:**
- Create: `frontend/app/(workbench)/loading.tsx`
- Create: `frontend/app/(workbench)/error.tsx`
- Create: `frontend/app/(workbench)/categories/[category]/loading.tsx`
- Create: `frontend/app/(workbench)/categories/[category]/error.tsx`

- [ ] **Step 23.1: Workbench-wide loading**

```tsx
// frontend/app/(workbench)/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-[420px]" />
    </div>
  );
}
```

- [ ] **Step 23.2: Workbench-wide error boundary**

```tsx
// frontend/app/(workbench)/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
        <h1 className="text-base font-semibold text-[var(--text-primary)]">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {error.message || "An unexpected error occurred."}
        </p>
        <Button onClick={reset} className="mt-4" size="sm">
          Try again
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 23.3: Category-specific loading (table-shaped skeleton)**

```tsx
// frontend/app/(workbench)/categories/[category]/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="h-[calc(100vh-2.75rem)] flex">
      <div className="flex-1 p-6 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-64" />
        <div className="space-y-2 mt-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      </div>
      <div className="w-80 border-l border-[var(--border-subtle)] p-4 space-y-3">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-10 w-24" />
        <div className="space-y-2 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 23.4: Category-specific error**

```tsx
// frontend/app/(workbench)/categories/[category]/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
        <h1 className="text-base font-semibold text-[var(--text-primary)]">
          Couldn&rsquo;t load this category
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {error.message || "Failed to fetch rankings for this category."}
        </p>
        <Button onClick={reset} className="mt-4" size="sm">
          Try again
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 23.5: Verify in browser**

Open DevTools Network tab, throttle to "Slow 3G", navigate to `/` → see KPI/scatter skeletons before content. Navigate to a category → see table skeleton.

To test error boundary: temporarily throw inside `getOverviewKpis()` (`throw new Error("test");`) → see the error UI with "Try again" button. Revert.

- [ ] **Step 23.6: Commit**

```bash
git add frontend/app/\(workbench\)
git commit -m "Add loading skeletons and error boundaries for workbench routes"
```

---

## Phase 9 — Final verification

### Task 24: Walk through the spec's verification checklist

- [ ] **Step 24.1: Start fresh dev server and run through every checklist item**

```bash
cd frontend
npm run dev
```

Verify each item from `docs/superpowers/specs/2026-04-29-dashboard-ui-design.md`'s "Verification Checklist (Phase 1 done)":

- [ ] All Phase 1 routes load without errors as both regular user and admin.
  - `/`, `/categories/<each-category>`, `/funds/<ticker>`, `/compare`, `/scatter`, `/distribution`.
  - As admin: `/formulas`, `/upload`.
- [ ] Old `/rankings/[category]` URLs redirect to `/categories/[category]`.
  - Visit `/rankings/Large%20Blend` → confirm 308 redirect in DevTools Network panel.
- [ ] Sidebar highlights the active route correctly across all routes.
- [ ] Fund search in topbar finds funds by ticker and routes correctly.
- [ ] Clicking a row in the workbench grid updates `?fund=` in the URL and populates the right panel.
- [ ] Reloading a `?fund=TICKER` URL renders the panel populated.
- [ ] Score colors match the spec's three-tier semantic palette (forest green / amber / deep red).
- [ ] Typography: Inter for UI, JetBrains Mono with tabular-nums for all numeric values.
- [ ] No "best/winner/top pick" language anywhere — copy uses "highest-scoring," "decision-support," "of 100".
- [ ] Admin-only links in the sidebar appear only when `isAdmin` is true.
- [ ] Loading skeletons appear for each route during navigation (test with throttled network).
- [ ] Error boundary on each route surfaces real errors with a retry option (test by temporarily throwing in a query).
- [ ] Motion: right-panel transitions are smooth and not distracting.
- [ ] Dark mode renders correctly with the new tokens (toggle OS dark mode).

- [ ] **Step 24.2: Run typecheck and lint**

```bash
cd frontend
npx tsc --noEmit
npm run lint
```

Fix any errors or warnings. Re-run until clean.

- [ ] **Step 24.3: Final commit**

```bash
git add -A frontend
git commit --allow-empty -m "Phase 1 dashboard redesign complete"
```

- [ ] **Step 24.4: Update tasks/lessons.md if any corrections occurred**

Per `.claude/CLAUDE.md`'s self-improvement loop: if the user corrected anything during execution, capture the pattern in `tasks/lessons.md` so the same mistake isn't repeated.

---

## Self-Review

After writing the plan, re-checked against the spec:

- **Spec coverage:** Every section of the spec maps to at least one task. Decision-support framing is enforced through copy in Tasks 13, 15, 19, and 24. Visual design tokens, fonts, motion, and shadcn install are covered by Tasks 1–2. Layout shell is Tasks 5–9. Data helpers are Tasks 10–12. Overview is Tasks 13–15. Workbench is Tasks 16–19. Fund-detail refresh and redirect are Tasks 20–21. Phase 2 placeholders are Task 22. Loading/errors are Task 23. Verification is Task 24.

- **Placeholder scan:** All steps include real code or commands. No "TBD," "fill in details," or "implement appropriate handling." The two notes about possible API divergence (Next.js header lookup in Task 7, AG Grid module API in Task 17, motion import path in Task 19) are explicit fall-back instructions, not placeholders.

- **Type consistency:** `RankingRow`, `OverviewKpis`, `FundScatterRow`, `HighestPerCategoryRow`, `PeerMetric`, and `FundPeerStats` types are used consistently. `scoreColorVar` is the canonical helper. Component props match between definition and usage.

- **Scope:** All tasks fit within Phase 1 of the spec. No work bleeds into Phase 2 features (compare/scatter/distribution are placeholders only).
