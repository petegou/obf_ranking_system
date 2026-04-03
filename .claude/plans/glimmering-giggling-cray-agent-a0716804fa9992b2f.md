# Migration Plan: Oak Bridge Fund Ranking System to Vercel + Supabase

## Overview

Migrate from Python FastAPI + Next.js to a fully serverless architecture:
Next.js on Vercel + Supabase (database, auth, RPC functions). The Python
backend is eliminated entirely. Scoring computation stays in TypeScript
(already ported in `frontend/lib/scoring.ts`) and is triggered via Next.js
API routes. A parallel track adds Supabase Auth with RLS for 7 internal users.

---

## Current State Assessment

**What already works and stays:**
- `frontend/lib/scoring.ts` — full TypeScript port of the Python scoring algorithm (verified identical logic to `backend/app/scoring.py`)
- `frontend/lib/normalize.ts` — percentile ranking logic
- `frontend/lib/csv-import.ts` — CSV parsing, upsert, and recalculation trigger
- `frontend/lib/supabase.ts` — Supabase client (currently uses SERVICE_ROLE_KEY)
- All 8 API routes already exist under `frontend/app/api/`
- `supabase/schema.sql` — funds, scoring_config, upload_log tables
- All page components (home, funds, rankings/[category], fund/[ticker], formulas)

**What needs to change:**
1. Supabase client needs two variants: server (service key) and browser (anon key + auth)
2. Authentication layer (Supabase Auth, middleware, RLS)
3. API routes need auth guards
4. Frontend pages need auth-protected layout
5. Formulas page needs admin-only gate
6. Vercel deployment config
7. Python backend removed from deployment

**Key architectural decision — Scoring in TypeScript vs. PostgreSQL materialized views:**

After reviewing the scoring algorithm, I recommend KEEPING scoring in TypeScript
(`frontend/lib/scoring.ts`) rather than migrating to PostgreSQL materialized views.
Rationale:
- The TypeScript scoring engine already exists, is tested, and mirrors the Python exactly
- The algorithm requires cross-row percentile ranking within categories, which is 
  expressible in SQL but results in ~300+ lines of deeply nested window functions
- Config changes are infrequent (admin-only, 7 users) — triggering a TypeScript
  recalculation via API route is simpler and more maintainable than REFRESH MATERIALIZED VIEW
- Scores are already stored back into the `funds` table (computed columns), so reads are fast
- Debugging scoring bugs in TypeScript is far easier than in PL/pgSQL

However, I provide the materialized view SQL design below as an OPTIONAL Phase 2
optimization if the team later wants database-side scoring.

---

## Phase 1: Authentication & Authorization

### 1A. Supabase Auth Setup (Supabase Dashboard)

Manual steps in Supabase dashboard:
1. Enable Email auth provider (Settings > Authentication > Providers)
2. Disable "Enable email signups" — only admin-invited users can join
3. Invite 7 users via Dashboard > Authentication > Users > Invite User
4. Create a `user_roles` table and assign roles

### 1B. New SQL migration: `supabase/migrations/001_auth_and_rls.sql`

```sql
-- User roles for authorization
CREATE TABLE IF NOT EXISTS user_roles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS on funds (read for all authenticated, write for service role only)
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read funds"
  ON funds FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can do anything with funds"
  ON funds FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS on scoring_config (read for all authenticated, write for admins only)
ALTER TABLE scoring_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read config"
  ON scoring_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can modify config"
  ON scoring_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Service role can do anything with config"
  ON scoring_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS on upload_log
ALTER TABLE upload_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read upload_log"
  ON upload_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert upload_log"
  ON upload_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- RLS on user_roles (users can read their own role)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

### 1C. Supabase Client Refactor

**File: `frontend/lib/supabase.ts`** — refactor into two clients:

```typescript
// Server-side client using service role key (for API routes that do writes)
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**New file: `frontend/lib/supabase-browser.ts`** — browser client with auth:

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**New file: `frontend/lib/supabase-server.ts`** — server component client:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

**New dependency:** `@supabase/ssr` — add to package.json

### 1D. Auth Middleware

**New file: `frontend/middleware.ts`**

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  
  // Allow login page without auth
  if (request.nextUrl.pathname === "/login") {
    if (user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // Protect everything else
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
```

### 1E. Login Page

**New file: `frontend/app/login/page.tsx`**

A client component with email/password form that calls `supabase.auth.signInWithPassword()` or `supabase.auth.signInWithOtp()` for magic link. On success, redirect to `/`. Simple form with Oak Bridge branding.

### 1F. Auth Context Provider

**New file: `frontend/lib/auth-context.tsx`**

React context providing `user`, `role` (admin/viewer), `signOut()`. Wraps the app in layout.tsx. Fetches the user's role from `user_roles` table on mount.

### 1G. Layout Updates

**Modify: `frontend/app/layout.tsx`**
- Wrap children in `AuthProvider`
- Conditionally show "Formulas" nav link only for admin users
- Add "Sign Out" button in header
- Add user avatar/email display

---

## Phase 2: API Route Updates

All existing API routes already work with Supabase. The changes needed are:

### 2A. Auth Guards on Write Endpoints

**Modify: `frontend/app/api/config/route.ts`**
- GET: No change needed (reads are allowed for authenticated users via RLS)
- PUT: Add auth check — verify user is admin before allowing config update
  - Use `supabaseAdmin` (service role) for the actual write
  - But first verify the request comes from an admin by checking the session

```typescript
// Pattern for auth-guarded API routes:
import { createSupabaseServer } from "@/lib/supabase-server";

export async function PUT(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  // Check admin role
  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("id", user.id)
    .single();
  
  if (role?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // ... proceed with config update using supabaseAdmin ...
}
```

**Modify: `frontend/app/api/config/reset/route.ts`**
- Same admin guard pattern

**Modify: `frontend/app/api/upload/route.ts`**
- Add admin guard (only admins can upload CSV data)

### 2B. Read Endpoints

**Files: categories/route.ts, rankings/route.ts, rankings/all/route.ts, fund/[ticker]/route.ts**
- These use `supabaseAdmin` (service role) which bypasses RLS
- This is fine for server-side API routes — they are already protected by the middleware
- No changes strictly required, but optionally add session validation

### 2C. New API Route: User Role Check

**New file: `frontend/app/api/auth/role/route.ts`**

```typescript
export async function GET() {
  // Returns { role: "admin" | "viewer" | null } for the current user
}
```

### 2D. Scoring Recalculation

The existing `recalculateAllRankings()` in `frontend/lib/scoring.ts` already:
1. Reads config from `scoring_config` table
2. Reads funds by category from `funds` table
3. Computes all scores (risk, return, GPA)
4. Writes scores back to `funds` table
5. Is called by PUT `/api/config` and POST `/api/upload`

**No changes needed.** This function runs server-side in the API route context.

---

## Phase 3: Frontend Updates

### 3A. Formulas Page — Admin Gate

**Modify: `frontend/app/formulas/page.tsx`**
- Add role check: if user is not admin, show "Access Denied" message
- Use the `AuthContext` to get the user's role
- Already a client component ("use client") so this is straightforward

### 3B. Home Page — Remove Backend Reference

**Modify: `frontend/app/page.tsx`**
- The error state currently says "Make sure the backend is running at {getBaseUrl()}"
- Change to "No fund data available. Contact an administrator."
- The `getBaseUrl()` calls still work — they point to the Next.js app itself

### 3C. Navigation — Conditional Formulas Link

**Modify: `frontend/app/layout.tsx`**
- The header nav currently always shows "Formulas" link
- Make it conditional on admin role
- Since layout.tsx is a server component, need to either:
  - Use a client component for the nav section
  - Or use the server-side supabase to check the role

**Recommended: Create `frontend/components/nav-header.tsx`** as a client component that uses AuthContext.

### 3D. Add Upload UI

Currently there is an upload API route (`/api/upload`) but no UI for it.

**New file: `frontend/app/upload/page.tsx`**
- Admin-only page
- File input for CSV upload
- Shows upload results (rows inserted/updated/skipped/errors)
- Calls POST `/api/upload` with FormData

Add "Upload" link to nav header (admin only).

---

## Phase 4: Vercel Deployment

### 4A. vercel.json

**New file: `frontend/vercel.json`**

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

Alternatively, Vercel auto-detects Next.js so this file may be optional.
The key thing is to set the root directory to `frontend/` in Vercel project settings.

### 4B. Environment Variables (set in Vercel Dashboard)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 4C. next.config.ts Updates

**Modify: `frontend/next.config.ts`**
- Add security headers
- No CORS config needed (API routes are same-origin)

```typescript
const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
};
```

### 4D. Remove Python Backend from Deployment

- The `backend/` directory is not deployed to Vercel (Vercel only deploys `frontend/`)
- Optionally archive/delete the `backend/` directory
- Update any README to reflect the new architecture

---

## Phase 5 (Optional): PostgreSQL Materialized View for Scoring

If in the future the team wants scoring to happen entirely in the database
(e.g., for scheduled refreshes, or to allow direct SQL queries against scores),
here is the design. This is NOT required for the migration.

### 5A. Percentile Rank Function

**New SQL function:** `supabase/migrations/002_scoring_functions.sql`

```sql
-- Percentile rank within a partition, handling ties via average
CREATE OR REPLACE FUNCTION percentile_rank_in_category(
  p_value DOUBLE PRECISION,
  p_category TEXT,
  p_column TEXT,
  p_invert BOOLEAN DEFAULT FALSE
)
RETURNS DOUBLE PRECISION AS $$
  -- Would use PERCENT_RANK() window function within category partition
  -- Complex due to NULL handling and tie-averaging requirement
$$ LANGUAGE sql;
```

The actual implementation would use `PERCENT_RANK() OVER (PARTITION BY category ORDER BY column_value)` window functions, but the complexity comes from:
- 12 risk metrics each needing blend(3yr, 5yr) then percentile rank
- Configurable weights read from scoring_config at query time
- NULL handling matching the TypeScript logic exactly

A materialized view approach would look like:

```sql
CREATE MATERIALIZED VIEW fund_scores AS
WITH config AS (
  SELECT
    (SELECT config_value::numeric FROM scoring_config WHERE config_key = 'blend_weight_3yr') AS w3,
    (SELECT config_value::numeric FROM scoring_config WHERE config_key = 'blend_weight_5yr') AS w5,
    (SELECT config_value::numeric FROM scoring_config WHERE config_key = 'short_record_penalty') AS penalty,
    -- ... all other config values
),
blended_risk AS (
  SELECT
    id, ticker, category,
    CASE
      WHEN beta_3yr IS NOT NULL AND beta_5yr IS NOT NULL
        THEN beta_3yr * (SELECT w3 FROM config) + beta_5yr * (SELECT w5 FROM config)
      WHEN beta_3yr IS NOT NULL
        THEN beta_3yr * (SELECT penalty FROM config)
      ELSE beta_5yr
    END AS beta_blended,
    -- ... repeat for all 12 risk metrics
  FROM funds
),
risk_percentiles AS (
  SELECT
    id, ticker, category,
    100.0 - PERCENT_RANK() OVER (PARTITION BY category ORDER BY beta_blended) * 100 AS beta_pct,
    -- beta is inverted (lower is better)
    PERCENT_RANK() OVER (PARTITION BY category ORDER BY r_squared_blended) * 100 AS r_squared_pct,
    -- ... repeat for all 12 metrics with correct inversion
  FROM blended_risk
),
-- ... many more CTEs for return components, relative returns, etc.
final AS (
  SELECT
    id, ticker, category,
    -- weighted average risk score
    -- weighted average return score
    -- market cap bonus
    -- turnover penalty
    -- final GPA
  FROM ...
)
SELECT * FROM final;

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_fund_scores()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY fund_scores;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

This materialized view would be ~300-400 lines of SQL. The TypeScript approach
is recommended for maintainability.

---

## Implementation Sequence

### Sprint 1 (Auth Foundation) — ~2 days
1. Install `@supabase/ssr` dependency
2. Run SQL migration `001_auth_and_rls.sql`
3. Create `supabase-browser.ts` and `supabase-server.ts`
4. Rename existing `supabase.ts` export to `supabaseAdmin`
5. Update all imports in existing API routes (`supabase` -> `supabaseAdmin`)
6. Create `middleware.ts`
7. Create `app/login/page.tsx`
8. Create `lib/auth-context.tsx`
9. Invite 7 users in Supabase dashboard, assign roles in `user_roles`

### Sprint 2 (API Auth Guards) — ~1 day
1. Add admin guards to PUT `/api/config`, POST `/api/config/reset`, POST `/api/upload`
2. Create GET `/api/auth/role` endpoint
3. Test all API routes with authenticated and unauthenticated requests

### Sprint 3 (Frontend Polish) — ~1 day
1. Update `layout.tsx` with auth provider and conditional nav
2. Create `components/nav-header.tsx` client component
3. Add admin gate to formulas page
4. Create upload page UI (`app/upload/page.tsx`)
5. Update home page error messaging

### Sprint 4 (Deployment) — ~0.5 days
1. Set environment variables in Vercel
2. Configure Vercel project root directory to `frontend/`
3. Update `next.config.ts` with security headers
4. Deploy and verify
5. Test auth flow end-to-end in production

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/001_auth_and_rls.sql` | user_roles table, RLS policies, is_admin() function |
| `frontend/lib/supabase-browser.ts` | Browser-side Supabase client with auth |
| `frontend/lib/supabase-server.ts` | Server component Supabase client with cookie-based auth |
| `frontend/lib/auth-context.tsx` | React context for user/role state |
| `frontend/middleware.ts` | Auth middleware — redirect unauthenticated to /login |
| `frontend/app/login/page.tsx` | Login page (email/password or magic link) |
| `frontend/app/upload/page.tsx` | CSV upload UI (admin only) |
| `frontend/app/api/auth/role/route.ts` | GET current user role |
| `frontend/components/nav-header.tsx` | Client component for auth-aware navigation |

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/lib/supabase.ts` | Rename export to `supabaseAdmin`, keep service role key |
| `frontend/app/api/config/route.ts` | Add admin auth guard to PUT handler |
| `frontend/app/api/config/reset/route.ts` | Add admin auth guard |
| `frontend/app/api/upload/route.ts` | Add admin auth guard |
| `frontend/app/layout.tsx` | Wrap in AuthProvider, use NavHeader component |
| `frontend/app/formulas/page.tsx` | Add admin-only gate |
| `frontend/app/page.tsx` | Update error message (remove backend reference) |
| `frontend/next.config.ts` | Add security headers |
| `frontend/package.json` | Add `@supabase/ssr` dependency |

## Files Unchanged

| File | Reason |
|------|--------|
| `frontend/lib/scoring.ts` | Already complete TypeScript scoring engine |
| `frontend/lib/normalize.ts` | Already complete percentile ranking |
| `frontend/lib/csv-import.ts` | Already complete CSV import |
| `frontend/lib/api.ts` | getBaseUrl() works for Vercel |
| `frontend/app/api/categories/route.ts` | Read-only, protected by middleware |
| `frontend/app/api/rankings/route.ts` | Read-only, protected by middleware |
| `frontend/app/api/rankings/all/route.ts` | Read-only, protected by middleware |
| `frontend/app/api/fund/[ticker]/route.ts` | Read-only, protected by middleware |
| `frontend/app/funds/page.tsx` | No changes needed |
| `frontend/app/rankings/[category]/page.tsx` | No changes needed |
| `frontend/app/fund/[ticker]/page.tsx` | No changes needed |
| `supabase/schema.sql` | Base schema stays as-is |

## Risks and Mitigations

1. **Scoring consistency**: The TypeScript engine in `scoring.ts` already matches the Python logic exactly (verified by code comparison). Both use the same blend/percentile/weighted-average pattern.

2. **Vercel function timeout**: `recalculateAllRankings()` iterates through categories sequentially and updates each fund individually. With ~100 funds across 14 categories, this should complete in <10 seconds. If it becomes slow, batch the updates using `supabaseAdmin.from("funds").upsert([...])` instead of individual updates.

3. **RLS + service role key**: API routes use the service role key which bypasses RLS. This is intentional — RLS protects direct Supabase access from the browser. API routes enforce auth via middleware and explicit checks.

4. **Magic link vs password**: For 7 internal users, email/password is simpler to set up. Magic link is more secure but requires email delivery configuration in Supabase.

5. **Next.js 16 compatibility**: The project uses Next.js 16.2.2 which has breaking changes. The `@supabase/ssr` package and middleware pattern need to be verified against the Next.js docs in `node_modules/next/dist/docs/`.
