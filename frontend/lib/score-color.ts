/**
 * Map a numeric score (0-100) to a CSS variable for semantic coloring.
 *
 * Bands:
 *   >= 70 -> strong   (--score-strong)
 *   30-69 -> moderate (--score-moderate)
 *   < 30  -> weak     (--score-weak)
 *
 * Returns a CSS `var(...)` string suitable for inline style colors.
 */
export function scoreColorVar(score: number): string {
  if (score >= 70) return "var(--score-strong)";
  if (score >= 30) return "var(--score-moderate)";
  return "var(--score-weak)";
}
