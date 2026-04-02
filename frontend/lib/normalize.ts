/**
 * Percentile ranking within a category (0–100).
 * null values are preserved. Ties receive the average percentile.
 */
export function percentileRank(
  values: (number | null)[],
  invert = false
): (number | null)[] {
  const indexed: { idx: number; val: number }[] = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== null && values[i] !== undefined) {
      indexed.push({ idx: i, val: values[i] as number });
    }
  }

  const n = indexed.length;
  const result: (number | null)[] = new Array(values.length).fill(null);

  if (n === 0) return result;
  if (n === 1) {
    result[indexed[0].idx] = 50.0;
    return invert ? result.map((v) => (v !== null ? round(100 - v) : null)) : result;
  }

  indexed.sort((a, b) => a.val - b.val);

  let rank = 0;
  while (rank < n) {
    let tieEnd = rank + 1;
    while (tieEnd < n && indexed[tieEnd].val === indexed[rank].val) {
      tieEnd++;
    }

    let avgPct = 0;
    for (let r = rank; r < tieEnd; r++) {
      avgPct += (r / (n - 1)) * 100;
    }
    avgPct /= tieEnd - rank;

    for (let r = rank; r < tieEnd; r++) {
      result[indexed[r].idx] = round(avgPct);
    }

    rank = tieEnd;
  }

  if (invert) {
    return result.map((v) => (v !== null ? round(100 - v) : null));
  }
  return result;
}

function round(v: number): number {
  return Math.round(v * 10000) / 10000;
}
