"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function NavHeader() {
  const { user, isAdmin, signOut, loading } = useAuth();
  const pathname = usePathname();

  // Hide nav header on login page
  if (pathname === "/login") {
    return null;
  }

  return (
    <header
      className="border-b"
      style={{
        backgroundColor: "var(--accent)",
        borderColor: "var(--card-border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <span
            className="text-2xl font-bold tracking-tight"
            style={{ color: "#ffffff" }}
          >
            Oak Bridge
          </span>
          <span
            className="text-sm font-medium tracking-wide uppercase"
            style={{ color: "var(--gold)" }}
          >
            Fund Rankings
          </span>
        </Link>
        <nav className="flex items-center gap-5">
          <Link
            href="/funds"
            className="text-sm font-medium no-underline hover:underline"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            All Funds
          </Link>
          {isAdmin && (
            <Link
              href="/formulas"
              className="text-sm font-medium no-underline hover:underline"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              Formulas
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/upload"
              className="text-sm font-medium no-underline hover:underline"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              Upload
            </Link>
          )}
          {!loading && user && (
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/20">
              <span
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="text-xs font-medium px-3 py-1 rounded transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: "rgba(255,255,255,0.15)",
                  color: "#ffffff",
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
