"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccountMenu } from "./account-menu";
import type { CategoryNavItem } from "./app-shell";

const STORAGE_KEY = "obf.sidebar.expanded.v1";
const UNCATEGORIZED_LABEL = "Uncategorized";

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
          ? "bg-[var(--brand-primary-tint)] text-[var(--brand-primary)] font-medium"
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

type TreeNode =
  | {
      kind: "group";
      label: string;
      path: string;
      count: number;
      children: TreeNode[];
    }
  | {
      kind: "leaf";
      label: string;
      category: string;
      count: number;
    };

function leafLabel(item: CategoryNavItem): string {
  return (
    item.level_4 ?? item.level_3 ?? item.level_2 ?? item.level_1 ?? item.category
  );
}

function buildSubtree(
  rows: CategoryNavItem[],
  depth: 2 | 3 | 4,
  parentPath: string
): TreeNode[] {
  const levelKey =
    depth === 2 ? "level_2" : depth === 3 ? "level_3" : "level_4";
  const byKey = new Map<string | null, CategoryNavItem[]>();
  for (const row of rows) {
    const key = row[levelKey] ?? null;
    const bucket = byKey.get(key);
    if (bucket) bucket.push(row);
    else byKey.set(key, [row]);
  }

  const out: TreeNode[] = [];
  for (const [key, group] of byKey.entries()) {
    if (key === null) {
      for (const r of group) {
        out.push({
          kind: "leaf",
          label: leafLabel(r),
          category: r.category,
          count: r.count,
        });
      }
      continue;
    }
    const childPath = `${parentPath} > ${key}`;
    const children =
      depth < 4
        ? buildSubtree(group, (depth + 1) as 3 | 4, childPath)
        : group.map<TreeNode>((r) => ({
            kind: "leaf",
            label: leafLabel(r),
            category: r.category,
            count: r.count,
          }));

    if (children.length === 1 && children[0].kind === "leaf") {
      out.push(children[0]);
    } else {
      const count = children.reduce((sum, c) => sum + c.count, 0);
      out.push({ kind: "group", label: key, path: childPath, count, children });
    }
  }

  out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "group" ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
  return out;
}

function buildCategoryTree(items: CategoryNavItem[]): TreeNode[] {
  const byL1 = new Map<string, CategoryNavItem[]>();
  for (const item of items) {
    const key = item.level_1 ?? UNCATEGORIZED_LABEL;
    const bucket = byL1.get(key);
    if (bucket) bucket.push(item);
    else byL1.set(key, [item]);
  }

  const l1Keys = [...byL1.keys()].sort((a, b) => {
    if (a === UNCATEGORIZED_LABEL) return 1;
    if (b === UNCATEGORIZED_LABEL) return -1;
    return a.localeCompare(b);
  });

  const out: TreeNode[] = [];
  for (const l1 of l1Keys) {
    const rows = byL1.get(l1)!;
    const children = buildSubtree(rows, 2, l1);
    if (children.length === 1 && children[0].kind === "leaf") {
      out.push(children[0]);
    } else {
      const count = children.reduce((sum, c) => sum + c.count, 0);
      out.push({ kind: "group", label: l1, path: l1, count, children });
    }
  }
  return out;
}

function findPathsToCategory(
  nodes: TreeNode[],
  category: string,
  acc: string[][] = [],
  trail: string[] = []
): string[][] {
  for (const node of nodes) {
    if (node.kind === "leaf") {
      if (node.category === category) acc.push([...trail]);
    } else {
      findPathsToCategory(node.children, category, acc, [...trail, node.path]);
    }
  }
  return acc;
}

interface GroupRowProps {
  node: Extract<TreeNode, { kind: "group" }>;
  open: boolean;
  onToggle: () => void;
}

function GroupRow({ node, open, onToggle }: GroupRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      title={node.label}
      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] transition-colors"
    >
      <span className="flex-1 min-w-0 truncate text-left">{node.label}</span>
      <span className="font-mono text-[11px] text-[var(--text-quaternary)] tabular-nums shrink-0">
        {node.count}
      </span>
    </button>
  );
}

interface CategoryTreeProps {
  nodes: TreeNode[];
  expanded: Record<string, boolean>;
  onToggle: (path: string) => void;
}

function CategoryTree({ nodes, expanded, onToggle }: CategoryTreeProps) {
  return (
    <>
      {nodes.map((node) => {
        if (node.kind === "leaf") {
          const href = `/categories/${encodeURIComponent(node.category)}`;
          return (
            <NavLink
              key={`leaf:${node.category}`}
              href={href}
              label={node.label}
              count={node.count}
              isActive={(p) => p === href}
            />
          );
        }
        const open = expanded[node.path] ?? false;
        return (
          <div key={`group:${node.path}`}>
            <GroupRow
              node={node}
              open={open}
              onToggle={() => onToggle(node.path)}
            />
            {open && (
              <div className="ml-4 pl-2 border-l border-[var(--border-subtle)]">
                <CategoryTree
                  nodes={node.children}
                  expanded={expanded}
                  onToggle={onToggle}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

const EMPTY_EXPANSION: Record<string, boolean> = {};
let cachedExpansion: Record<string, boolean> | null = null;
const expansionListeners = new Set<() => void>();

function readExpansionFromStorage(): Record<string, boolean> {
  if (typeof window === "undefined") return EMPTY_EXPANSION;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_EXPANSION;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === "boolean") out[k] = v;
      }
      return out;
    }
  } catch {
    // ignore corrupt storage
  }
  return EMPTY_EXPANSION;
}

function getExpansionSnapshot(): Record<string, boolean> {
  if (!cachedExpansion) cachedExpansion = readExpansionFromStorage();
  return cachedExpansion;
}

function getServerExpansionSnapshot(): Record<string, boolean> {
  return EMPTY_EXPANSION;
}

function subscribeExpansion(callback: () => void): () => void {
  expansionListeners.add(callback);
  const handler = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cachedExpansion = readExpansionFromStorage();
    for (const fn of expansionListeners) fn();
  };
  window.addEventListener("storage", handler);
  return () => {
    expansionListeners.delete(callback);
    window.removeEventListener("storage", handler);
  };
}

function writeExpansion(next: Record<string, boolean>) {
  cachedExpansion = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private-mode failures
  }
  for (const fn of expansionListeners) fn();
}

export function Sidebar({ categories }: { categories: CategoryNavItem[] }) {
  const { isAdmin, user, signOut } = useAuth();
  const pathname = usePathname();

  const tree = useMemo(() => buildCategoryTree(categories), [categories]);

  const activeCategory = useMemo(() => {
    const match = pathname.match(/^\/categories\/([^/]+)/);
    if (!match) return null;
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  }, [pathname]);

  const stored = useSyncExternalStore(
    subscribeExpansion,
    getExpansionSnapshot,
    getServerExpansionSnapshot
  );

  const expanded = useMemo(() => {
    if (!activeCategory) return stored;
    const paths = findPathsToCategory(tree, activeCategory);
    if (paths.length === 0) return stored;
    const next: Record<string, boolean> = { ...stored };
    for (const trail of paths) for (const p of trail) next[p] = true;
    return next;
  }, [stored, tree, activeCategory]);

  const handleToggle = (path: string) => {
    const current = getExpansionSnapshot();
    writeExpansion({ ...current, [path]: !current[path] });
  };

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
        <CategoryTree
          nodes={tree}
          expanded={expanded}
          onToggle={handleToggle}
        />

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
          <AccountMenu user={user} isAdmin={isAdmin} onSignOut={signOut} />
        </div>
      )}
    </aside>
  );
}
