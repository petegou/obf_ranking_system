export const SNAPSHOT_DATE_PARAM = "date";
export const LATEST_SNAPSHOT_VALUE = "__latest__";

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
