"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { RankingSnapshot } from "@/lib/queries";
import { FundSearch } from "./fund-search";
import { SnapshotSelector } from "./snapshot-selector";

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
    crumbs.push({ label: parts[0] ?? "Overview" });
  }

  return crumbs;
}

export function TopBar({ snapshots }: { snapshots: RankingSnapshot[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const crumbs = parseCrumbs(pathname);

  function withCurrentDate(href: string) {
    const date = searchParams.get("date");
    if (!date) return href;
    const [path, query = ""] = href.split("?");
    const params = new URLSearchParams(query);
    params.set("date", date);
    return `${path}?${params.toString()}`;
  }

  return (
    <header className="h-11 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-card)] flex items-center px-4 gap-3">
      <nav
        className="flex items-center gap-1.5 text-sm min-w-0"
        aria-label="Breadcrumb"
      >
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;

          return (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && (
                <span className="text-[var(--text-quaternary)]">/</span>
              )}
              {c.href && !isLast ? (
                <Link
                  href={withCurrentDate(c.href)}
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
      <SnapshotSelector snapshots={snapshots} />
      <FundSearch />
    </header>
  );
}
