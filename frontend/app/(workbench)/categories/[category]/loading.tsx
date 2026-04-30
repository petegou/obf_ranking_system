import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="h-[calc(100vh-2.75rem)] flex">
      <div className="flex-1 p-6 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-64" />
        <div className="space-y-2 mt-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton key={index} className="h-8" />
          ))}
        </div>
      </div>
      <div className="w-80 border-l border-[var(--border-subtle)] p-4 space-y-3">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-10 w-24" />
        <div className="space-y-2 mt-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-4" />
          ))}
        </div>
      </div>
    </div>
  );
}
