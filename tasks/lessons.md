# Lessons

> Living list of patterns we've learned to apply (or avoid). Read at session
> start. Add to it at session end. Each entry is short — one rule + one
> sentence of why — with a reference to where it bit us so future agents can
> verify the lesson still applies.

---

## Data import

### Excel CSV exports are lossy. Prefer .xlsx via exceljs.
When a file originates in Excel, the `Save As → .csv` step serializes the
*displayed string*, not the raw cell value. Cells formatted as `0.00%` get
multiplied by 100 on the way out; cells formatted as `0.00` lose decimals
past the second place. **Read .xlsx directly via the `exceljs` library so
raw cell values survive.** See commit `1886cd5` and the comments at the top
of `frontend/lib/csv-import.ts` — this bit us on the first production
upload of `Updated Fund Rankings.csv` (std_dev `0.006357` arrived as `0.01`;
tracking_error `5.42` arrived as `542`).

### Ask where a data file originates before designing the importer.
In brainstorming for any data-import task, explicitly ask: *where does this
file come from, what tool produced it, and what does that tool's
serialization preserve or destroy?* Caught us in the Updated Fund Rankings
work — the spec assumed the CSV faithfully represented the source data;
the source was Excel, and the export was lossy in well-known ways.

### Distinguish "0" from "missing" at import time.
For metrics where 0 is non-physical (e.g., `std_dev_3yr = 0` for a real
fund), decide deliberately whether the upstream `0` means "unavailable" or
"genuinely zero." Default to treating it as the upstream provider intended,
but document the choice — the wrong call collapses ~30% of funds onto x=0
on the scatter chart (Updated Fund Rankings, 2026-05-20).

---

## Verification

### "Verification" tasks aren't done until I've actually run the verification.
A task that claims to verify behavior is incomplete until I've exercised
the behavior end-to-end on representative data. For import work that means:
upload the file, spot-check at least 3 representative rows in the DB, *then*
mark the task complete. If I can't run it myself, mark the task
`gated-on-user-action` and surface that explicitly to the user.

Updated Fund Rankings Task 9 was marked complete with the verification
deferred to "the admin UI when ready." The unit/precision bugs only
surfaced when the user opened the scatter chart and noticed it looked
wrong — i.e., the user did the verification, not me.

### Verify *values*, not just *schema*.
Schema-level checks ("all expected columns are present, types are right,
rows uploaded") are necessary but not sufficient for data work. Pull a
handful of representative rows and confirm the numeric values make sense
in context (magnitude, units, sign, missing-vs-zero). A correct schema
with corrupted values is worse than a missing column because it's
invisible until someone looks at the output.

### For data-import specs, include a "data-quality risks" section.
List anticipated risks per field family before implementation:
precision loss, unit/scale assumptions, missing-vs-zero ambiguity, and
how to detect each in a spot check. We did not have this for the Updated
Fund Rankings CSV work — every unit/precision issue we hit could have
been listed as a risk-to-verify in the spec.

---

## Session hygiene

### Pre-flight before planning.
At the start of every session:
1. `git status` — surface any dirty tree to the user before planning.
   If files I'm about to touch have uncommitted edits, understand what
   they are and confirm with the user before proceeding.
2. Read `tasks/lessons.md` (this file) — refresh recurring patterns.
3. Read `tasks/todo.md` — check open follow-ups from prior sessions.
4. State scope to user; confirm before creating todos.

The Updated Fund Rankings session started with ~5 minutes of confusion
because backend-validation work was uncommitted in `frontend/lib/csv-import.ts`,
the very file I was about to rewrite. A `git status` first would have
surfaced it immediately.

### Don't commit changes the user didn't ask to commit.
Already in the root CLAUDE.md, but worth restating: never run `git commit`
unless the user explicitly asks. If unclear, ask first.

---

## Subagent dispatch

### Use a subagent if a task touches 3+ files or exceeds ~30 lines.
The controller-context discipline matters most when something unexpected
is about to land. If I do small tasks inline to save dispatch overhead,
my context becomes thick with code details right when I need it clean
for diagnostic work.

Updated Fund Rankings Task 8 (Last Price column: 3 files, ~30 lines) was
done inline. Right after, the user's scatter-chart bug report arrived
and I had to do data diagnostics with a heavier-than-ideal context.

### Pass spec excerpts to code-quality reviewers when the change has documented trade-offs.
The two-stage review (spec compliance → code quality) is effective, but
the code-quality reviewer doesn't see the spec by default. If a change
includes intentional trade-offs documented in the spec, paste the
relevant excerpt into the reviewer's prompt so it doesn't flag them as
"Critical" regressions.

In Updated Fund Rankings Task 4, the reviewer flagged "new tickers get
`name = ''`" as Critical. That was the explicit, user-approved design
choice from brainstorming. The reviewer didn't have that context.

---

## Migrations & production data

### Additive-only migrations are safe to apply directly to prod.
`ADD COLUMN IF NOT EXISTS` and similar additive operations are
idempotent and reversible enough that a Supabase branch is overhead.
Apply directly, confirm with `list_tables`, run advisors. (Updated Fund
Rankings migration 004 followed this path successfully.)

### Destructive migrations require a branch path.
`DROP COLUMN`, `ALTER TYPE`, `RENAME`, anything that mutates existing
data, or anything that touches RLS policies: apply to a Supabase branch
first, verify on the branch, then promote. Cost is ~$0.01/hr — cheap
relative to the blast radius.

### Test the importer against a representative sample BEFORE running scoring.
The first prod upload is not the time to discover unit mismatches. If
possible, run the importer in `dryRun` mode against the file, query a
handful of rows back, then commit + recalculate. Reduces "I uploaded
6,000 funds with wrong units and triggered a full ranking recalc"
mistakes.

---

## Domain (OBF Ranking System)

### Rankings are decision-support, not verdicts.
Already in the root CLAUDE.md, but worth restating in the lessons file
so it survives a CLAUDE.md change. Don't ship copy or UI that presents
results as "best fund" / "winner" / "definitive."

### The `percentDisplayValue` heuristic relies on magnitude.
`frontend/lib/metric-format.ts` distinguishes decimal-form values
(|x| ≤ 1, multiply by 100 for display) from already-percent values
(|x| > 1, display as-is). This means the importer can store values in
either convention and the UI displays correctly. Implication: storing
the same metric in different units across snapshots will silently
produce inconsistent percentile ranks. When changing the importer's
unit conventions, audit the existing data for the field.

### Scoring engine reads from `fund_metrics`; the deployed schema differs from `supabase/schema.sql`.
`schema.sql` documents an older single-table design. The live system uses
three tables: `funds` (registry), `fund_metrics` (per-snapshot metrics),
`fund_rankings` (per-snapshot computed scores). Inspect the live schema
via `mcp__supabase__list_tables` before writing any migration.
