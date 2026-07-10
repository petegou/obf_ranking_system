"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { RankingSnapshot } from "@/lib/queries";
import {
  formatSnapshotDate,
  LATEST_SNAPSHOT_VALUE,
  SNAPSHOT_DATE_PARAM,
  snapshotDateFromSearchParams,
} from "@/lib/snapshot-date";

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
  const routeValue = explicitDate ?? LATEST_SNAPSHOT_VALUE;
  const [selectedValue, setSelectedValue] = useState(routeValue);
  const [isPending, startTransition] = useTransition();
  const latestLabel = latestDate
    ? `Latest (${formatSnapshotDate(latestDate)})`
    : "Latest";
  const hasExplicitDate = explicitDate
    ? snapshots.some((snapshot) => snapshot.asOfDate === explicitDate)
    : true;

  useEffect(() => {
    setSelectedValue(routeValue);
  }, [routeValue]);

  function changeSnapshot(nextValue: string) {
    setSelectedValue(nextValue);
    const params = new URLSearchParams(searchParams.toString());
    if (nextValue === LATEST_SNAPSHOT_VALUE) {
      params.delete(SNAPSHOT_DATE_PARAM);
    } else {
      params.set(SNAPSHOT_DATE_PARAM, nextValue);
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
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
      <span className="relative inline-flex w-80">
        <select
          value={selectedValue}
          onChange={(event) => changeSnapshot(event.target.value)}
          aria-busy={isPending}
          className={`h-8 w-full appearance-none rounded-md border border-[var(--border-default)] bg-[var(--surface-card)] py-0 pl-3 pr-12 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] ${
            isPending ? "cursor-progress opacity-80" : ""
          }`}
        >
          <option value={LATEST_SNAPSHOT_VALUE}>{latestLabel}</option>
          {!hasExplicitDate && explicitDate ? (
            <option value={explicitDate}>
              {formatSnapshotDate(explicitDate)} (No data)
            </option>
          ) : null}
          {snapshots.map((snapshot) => (
            <option key={snapshot.asOfDate} value={snapshot.asOfDate}>
              {formatSnapshotDate(snapshot.asOfDate)}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]"
        />
      </span>
    </label>
  );
}
