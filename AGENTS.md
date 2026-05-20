# AGENTS.md - Codex Companion for OBF Ranking System

> Supplemental working instructions for Codex and other coding agents. Keep
> `.claude/CLAUDE.md` as the Claude-specific entry point; this file is the shared,
> Codex-readable project contract.

## Project Snapshot

| Field | Value |
| --- | --- |
| App | Financial ranking and decision-support tool for Oak Bridge Fund |
| URL | https://obf-ranking-system.vercel.app |
| Stack | Next.js, TypeScript, Supabase, Vercel |
| Auth | Login-gated; all routes are protected |
| Main code | `frontend/` |
| Database | `supabase/` migrations, schema, PL/pgSQL |
| Task log | `tasks/todo.md` |

## Collaboration Contract

- Claude keeps its startup guidance in `.claude/CLAUDE.md`.
- Codex reads this `AGENTS.md`; frontend-specific overrides live in
  `frontend/AGENTS.md`.
- Keep shared project rules synchronized between this file and
  `.claude/CLAUDE.md` when workflow or safety expectations change.
- Use `tasks/todo.md` as the common handoff surface for non-trivial work. Update
  it with the current plan, progress, verification notes, and open follow-ups.
- If another agent has touched files, treat those edits as intentional. Read
  them, build on them, and do not revert them unless the user explicitly asks.
- Prefer small, reviewable changes. Leave unrelated refactors for a separate
  task.

## Domain Rules

This is a financial decision-support tool. Rankings help compare investment
decisions; they are not absolute selections or definitive verdicts.

- Data accuracy and integrity matter more than speed of implementation.
- Understand ranking, scoring, weighting, and comparison logic before changing
  it. Check both `frontend/lib/` and `supabase/` before assuming where logic
  lives.
- Financial figures must be formatted clearly as currency, percentages, scores,
  or ratios as appropriate.
- Avoid floating-point arithmetic for monetary values unless the existing code
  deliberately uses it and the precision tradeoff is understood.

## Technical Conventions

- Use TypeScript strictly. Do not introduce `any` without a local comment that
  explains why it is acceptable.
- This is a Next.js App Router app. Use server components by default and add
  `"use client"` only when interactivity requires it.
- All routes are auth-protected. Do not add a route or data path that bypasses
  authentication.
- Supabase handles auth, database access, and storage.
- RLS is enabled. Schema changes require corresponding policy review, and RLS
  policy changes require explicit user confirmation.
- Write migrations for database changes. Do not mutate the production database
  directly.
- Do not expose service-role keys or secrets to client code.
- Do not add dependencies without asking first.

## Workflow

### Session pre-flight

Before planning anything, run this ritual at the top of every session:

1. `git status` — surface any dirty tree to the user before doing more. If
   files you are about to touch have uncommitted edits, understand them and
   confirm with the user before proceeding.
2. Read `tasks/lessons.md` — refresh recurring patterns from prior sessions.
3. Read `tasks/todo.md` — check open follow-ups.
4. State scope to user; confirm before creating todos.

### Planning and tracking

- For tasks with 3+ implementation steps, architectural decisions, database
  changes, auth changes, or ranking/scoring changes, update `tasks/todo.md` with
  a short checklist before editing code.
- For small, obvious fixes, keep the change narrow and still report what was
  verified.
- Track meaningful progress in `tasks/todo.md` when working from a checklist.
- If facts conflict between files, prefer the most local `AGENTS.md` for coding
  mechanics and `.claude/CLAUDE.md` / this file for project safety rules.
- Update `tasks/lessons.md` at session end when a durable, project-relevant
  pattern emerged — especially after a user correction.

## Verification

- Never call work complete without verification appropriate to the risk.
- For frontend changes, run the relevant lint/typecheck/build command when
  feasible.
- For ranking logic, verify outputs against known or derived expected values.
- For database changes, inspect the related migration and RLS impact before
  summarizing the work.
- **For data-import work specifically, verification means data verification.**
  Schema-level checks ("columns present, types correct, rows upserted") are not
  enough. Spot-check at least 3 representative rows in the DB and confirm
  magnitudes/units/signs match expectations before marking the task complete.
  If you cannot run the verification yourself, mark the task
  `gated-on-user-action` and surface that to the user — do not punt the
  verification while claiming the task is done.
- If verification cannot be run, state exactly why and what remains unverified.

## File Map

```text
obf_ranking_system/
├── AGENTS.md          # Shared Codex-readable project contract
├── .claude/CLAUDE.md  # Claude-specific project instructions
├── frontend/          # Next.js application
├── supabase/          # Migrations, schema, and DB-side logic
└── tasks/             # Shared plans, todos, and handoff notes
```
