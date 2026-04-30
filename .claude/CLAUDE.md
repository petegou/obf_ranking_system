# CLAUDE.md — OBF Ranking System

> Oak Bridge Fund Ranking System at obf-ranking-system.vercel.app. This is a financial
> decision-support tool. Read this file fully before starting any task.

---

## Project Overview

| Field    | Value                                                         |
| -------- | ------------------------------------------------------------- |
| App      | Financial ranking & decision-support tool for Oak Bridge Fund |
| URL      | https://obf-ranking-system.vercel.app                         |
| Stack    | Next.js · TypeScript · Supabase · Vercel                      |
| Auth     | Login-gated (all routes protected)                            |
| Language | TypeScript (~91%) + PL/pgSQL (~7%)                            |
| Deployed | Vercel                                                        |

---

## Domain Context

**This is a financial tool used to rank and compare investment decisions.** Rankings are
explicitly framed as "decision-support tools, not absolute selections." Keep this framing
in mind when building any UI or output feature — results should never be presented as
definitive verdicts.

- Data accuracy and integrity are critical. A bug that corrupts rankings has real
  decision-making consequences. Verify data flows carefully.
- The ranking logic likely involves scoring, weighting, or comparison algorithms. Understand
  the existing approach before modifying it — don't guess at business logic.
- PL/pgSQL in the `supabase/` directory means ranking logic may live in database functions.
  Check there before assuming computation happens on the frontend.

---

## Stack Conventions

### Frontend

- **TypeScript strictly** — no `any` types without explicit justification. Financial data
  should be typed precisely.
- **Next.js App Router** — server components by default. Only add `"use client"` when
  required for interactivity.
- All routes are auth-protected. Never build a feature that bypasses authentication.

### Backend / Database

- **Supabase** for auth, database, and storage.
- **RLS is enabled.** Any schema change requires a corresponding RLS policy update. Never skip.
- PL/pgSQL functions live in `supabase/` — ranking logic may be computed at the DB layer.
  Before moving logic to the frontend, understand why it's in the DB (likely for integrity
  or performance reasons).
- Write migrations for all schema changes. Never touch production DB directly.

### Data Handling

- Financial figures need to be handled with precision. Avoid floating-point arithmetic for
  monetary values — use integer math or a decimal library if needed.
- Never display raw unformatted numbers — always format currency, percentages, and scores
  with appropriate precision for the context.

---

## Workflow Orchestration

### Plan First

- For ANY task with 3+ steps or architectural decisions: enter Plan Mode first.
- Write the plan to `tasks/todo.md` with checkable items before touching code.
- Confirm plan before beginning implementation.
- If something goes sideways: STOP and re-plan. Don't push through.

### Subagent Strategy

- Use subagents to keep the main context clean.
- Offload: research, file exploration, parallel analysis, test runs.
- One focused task per subagent.

### Verification Before Done

- Never mark a task complete without proving it works.
- For ranking logic changes: verify outputs against known expected values before calling done.
- Ask yourself: "Would a staff engineer approve this?"
- Check Supabase logs if any backend work was done.

### Self-Improvement Loop

- After any correction from the user: update `tasks/lessons.md` with the pattern.
- Review `tasks/lessons.md` at session start before beginning work.
- Write rules that prevent repeating the same mistake.

---

## Task Management

1. **Plan First** — write `tasks/todo.md` with checkable items
2. **Verify Plan** — confirm before implementation
3. **Track Progress** — mark items complete as you go
4. **Explain Changes** — high-level summary at each meaningful step
5. **Document Results** — add a review section to `tasks/todo.md` when done
6. **Capture Lessons** — update `tasks/lessons.md` after any correction

---

## Core Principles

- **Simplicity First** — make every change as simple as possible. Touch minimal code.
- **No Laziness** — find root causes. No temporary hacks. No `// TODO fix later`.
- **Minimal Impact** — changes should only touch what's necessary. Don't refactor adjacent
  code unless it's directly blocking the task.
- **No New Dependencies** — don't add a new package without asking first.
- **Demand Elegance** — for non-trivial changes, ask: "is there a more elegant way?" If a
  fix feels hacky, implement the elegant solution. Skip for simple obvious fixes.
- **Understand Before Changing** — especially for ranking/scoring logic. Read and understand
  the existing implementation before proposing changes. The business logic here matters.

---

## Things to Never Do

- Never expose Supabase service role key or any secret to the client.
- Never modify RLS policies without explicit user confirmation.
- Never bypass authentication on any route.
- Never change ranking/scoring logic without understanding the current approach first.
- Never use floating-point math for financial values without deliberate intent.
- Never push a change without verifying it produces correct output.
- Never use `any` in TypeScript without a comment explaining why it's acceptable.
- Never modify a DB function in `supabase/` without writing a corresponding migration.

---

## Project Structure (inferred)

```
obf_ranking_system/
├── .claude/          # Claude Code config / slash commands
├── frontend/         # Next.js app
├── supabase/         # Migrations, DB functions (PL/pgSQL ranking logic lives here)
├── package-lock.json
└── CLAUDE.md
```
