"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
        <h1 className="text-base font-semibold text-[var(--text-primary)]">
          Could not load this category
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {error.message || "Failed to fetch rankings for this category."}
        </p>
        <Button onClick={reset} className="mt-4" size="sm">
          Try again
        </Button>
      </div>
    </div>
  );
}
