"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { snapshotDateFromSearchParams } from "@/lib/snapshot-date";

interface SearchResult {
  ticker: string;
  name: string;
  category: string;
}

interface SearchResponse {
  results?: SearchResult[];
}

export function FundSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedDate = snapshotDateFromSearchParams(searchParams);

  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query });
        if (selectedDate) params.set("date", selectedDate);
        const res = await fetch(
          `/api/funds/search?${params.toString()}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as SearchResponse;
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        // Ignore aborted or transient network failures while typing.
      }
    }, 150);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [query, selectedDate]);

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
    const params = new URLSearchParams();
    if (selectedDate) params.set("date", selectedDate);
    const queryString = params.toString();
    router.push(
      `/funds/${encodeURIComponent(ticker)}${queryString ? `?${queryString}` : ""}`
    );
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        type="text"
        placeholder="Search ticker..."
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
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
                {r.name} - {r.category}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
