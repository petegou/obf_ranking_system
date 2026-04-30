"use client";

import { Input } from "@/components/ui/input";

export function FundSearch() {
  return (
    <Input
      type="text"
      placeholder="Search by ticker..."
      className="h-8 w-48 text-sm"
      disabled
    />
  );
}
