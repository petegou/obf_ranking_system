"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { CategoryNavItem } from "./app-shell";

interface NavLinkProps {
  href: string;
  label: string;
  count?: number;
  disabled?: boolean;
  isActive: (pathname: string) => boolean;
}

function NavLink({ href, label, count, disabled, isActive }: NavLinkProps) {
  const pathname = usePathname();
  const active = !disabled && isActive(pathname);
  const baseClasses =
    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors";

  if (disabled) {
    return (
      <span
        className={`${baseClasses} text-[var(--text-quaternary)] cursor-not-allowed`}
        title={label}
      >
        <span className="flex-1 min-w-0 truncate">{label}</span>
        <span className="text-[10px] uppercase tracking-wider shrink-0">
          Soon
        </span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      title={label}
      className={`${baseClasses} no-underline ${
        active
          ? "bg-[var(--brand-primary-tint)] text-[var(--brand-primary)] font-medium border-l-2 border-[var(--brand-primary)] pl-[10px]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
      }`}
    >
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {count !== undefined && (
        <span className="font-mono text-[11px] text-[var(--text-quaternary)] tabular-nums shrink-0">
          {count}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-4 pb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--text-quaternary)]">
      {children}
    </div>
  );
}

export function Sidebar({ categories }: { categories: CategoryNavItem[] }) {
  const { isAdmin, user, signOut } = useAuth();

  return (
    <aside className="w-60 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--surface-card)] flex flex-col">
      <div className="shrink-0 px-4 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
            Oak Bridge
          </span>
          <span className="block w-3 h-px bg-[var(--brand-gold)]" aria-hidden />
        </div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mt-0.5">
          Fund Rankings
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <SectionLabel>Workspace</SectionLabel>
        <NavLink href="/" label="Overview" isActive={(p) => p === "/"} />

        <SectionLabel>Categories</SectionLabel>
        {categories.map((c) => (
          <NavLink
            key={c.category}
            href={`/categories/${encodeURIComponent(c.category)}`}
            label={c.category}
            count={c.count}
            isActive={(p) =>
              p === `/categories/${encodeURIComponent(c.category)}`
            }
          />
        ))}

        <SectionLabel>Analysis</SectionLabel>
        <NavLink href="/compare" label="Compare" disabled isActive={() => false} />
        <NavLink href="/scatter" label="Scatter" disabled isActive={() => false} />
        <NavLink
          href="/distribution"
          label="Distribution"
          disabled
          isActive={() => false}
        />

        {isAdmin && (
          <>
            <SectionLabel>Admin</SectionLabel>
            <NavLink
              href="/formulas"
              label="Formulas"
              isActive={(p) => p === "/formulas"}
            />
            <NavLink
              href="/upload"
              label="Upload"
              isActive={(p) => p === "/upload"}
            />
          </>
        )}
      </nav>

      {user && (
        <div className="shrink-0 px-3 py-3 border-t border-[var(--border-subtle)]">
          <div className="text-xs text-[var(--text-tertiary)] truncate">
            {user.email}
          </div>
          <button
            onClick={signOut}
            className="mt-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
