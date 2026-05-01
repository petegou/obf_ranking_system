"use client";

import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const MIN_PASSWORD_LEN = 8;

interface PasswordCheck {
  ok: boolean;
  reason?: string;
}

function validatePassword(pw: string): PasswordCheck {
  if (pw.length < MIN_PASSWORD_LEN) {
    return { ok: false, reason: `Must be at least ${MIN_PASSWORD_LEN} characters.` };
  }
  if (!/[a-z]/.test(pw)) return { ok: false, reason: "Must contain a lowercase letter." };
  if (!/[A-Z]/.test(pw)) return { ok: false, reason: "Must contain an uppercase letter." };
  if (!/[0-9]/.test(pw)) return { ok: false, reason: "Must contain a number." };
  if (!/[^A-Za-z0-9]/.test(pw)) {
    return { ok: false, reason: "Must contain a symbol." };
  }
  return { ok: true };
}

export default function PasswordSetupPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function submitOnEnter(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) {
      return;
    }

    e.preventDefault();
    e.currentTarget.form?.requestSubmit();
  }

  // Require an active session — token-exchange happens at /auth/callback first.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        router.replace("/login?error=session_required");
        return;
      }
      setEmail(data.user.email ?? null);
      setAuthReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const check = validatePassword(password);
    if (!check.ok) {
      setError(check.reason ?? "Password does not meet requirements.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    router.replace("/");
    router.refresh();
  }

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-base)] px-4">
        <div className="text-sm text-[var(--text-secondary)]">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--surface-base)] px-4 py-8 text-[var(--text-primary)] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-sm md:grid-cols-[0.9fr_1.1fr]">
          <div className="border-b border-[var(--border-subtle)] bg-[var(--brand-primary-tint)] p-6 md:border-b-0 md:border-r md:p-8">
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                Oak Bridge
              </h1>
              <span
                className="h-px w-6 bg-[var(--brand-gold)]"
                aria-hidden
              />
            </div>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
              Fund Rankings
            </p>
            <div className="mt-8 hidden border-l-2 border-[var(--brand-gold)] pl-4 text-sm font-medium text-[var(--text-secondary)] md:block">
              Invitation setup
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--brand-primary)]">
                Account setup
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                Set your password
              </h2>
            </div>

            {email && (
              <p className="mb-4 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                Setting password for{" "}
                <span className="font-medium text-[var(--text-primary)]">
                  {email}
                </span>
              </p>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
              autoComplete="off"
            >
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
                >
                  New password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={submitOnEnter}
                  required
                  autoFocus
                  minLength={MIN_PASSWORD_LEN}
                  autoComplete="new-password"
                  className="h-10 border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)]"
                  placeholder={`At least ${MIN_PASSWORD_LEN} characters`}
                />
                <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
                  Must include uppercase, lowercase, number, and symbol.
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirm"
                  className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
                >
                  Confirm password
                </label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={submitOnEnter}
                  required
                  minLength={MIN_PASSWORD_LEN}
                  autoComplete="new-password"
                  className="h-10 border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)]"
                  placeholder="Re-enter password"
                />
              </div>

              {error && (
                <div className="rounded-md border border-[var(--score-weak)]/20 bg-[var(--score-weak)]/10 px-3 py-2 text-sm text-[var(--score-weak)]">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || done}
                className="h-10 w-full bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90"
              >
                {loading ? "Saving..." : done ? "Saved" : "Set password"}
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
