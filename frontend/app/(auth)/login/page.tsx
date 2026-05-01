"use client";

import { Suspense, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_link: "This link is not valid. Please request a new invite or reset email.",
  link_expired: "This link has expired or already been used. Please request a new one.",
  session_required: "Please sign in to continue.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorFromParams =
    ERROR_MESSAGES[searchParams.get("error") ?? ""] ?? null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(errorFromParams);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const supabase = createSupabaseBrowserClient();

  function submitOnEnter(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) {
      return;
    }

    e.preventDefault();
    e.currentTarget.form?.requestSubmit();
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Generic message — don't leak whether the email exists.
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleSendReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/setup`;
    await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    // Always show success to avoid user-enumeration.
    setResetSent(true);
    setLoading(false);
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
              Private workspace
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--brand-primary)]">
                Secure access
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                {resetMode ? "Reset password" : "Sign in"}
              </h2>
            </div>

            {resetSent ? (
              <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                If an account exists for that email, a password reset link has
                been sent.
              </div>
            ) : (
              <form
                onSubmit={resetMode ? handleSendReset : handleSignIn}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={submitOnEnter}
                    required
                    autoFocus
                    autoComplete="email"
                    className="h-10 border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)]"
                    placeholder="name@oakbridgefund.com"
                  />
                </div>

                {!resetMode && (
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
                    >
                      Password
                    </label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={submitOnEnter}
                      required
                      autoComplete="current-password"
                      className="h-10 border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)]"
                      placeholder="Enter your password"
                    />
                  </div>
                )}

                {error && (
                  <div className="rounded-md border border-[var(--score-weak)]/20 bg-[var(--score-weak)]/10 px-3 py-2 text-sm text-[var(--score-weak)]">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-10 w-full bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90"
                >
                  {loading
                    ? resetMode
                      ? "Sending..."
                      : "Signing in..."
                    : resetMode
                    ? "Send reset link"
                    : "Sign in"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setError(null);
                    setResetMode(!resetMode);
                  }}
                  className="h-8 w-full text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                >
                  {resetMode ? "Back to sign in" : "Forgot password?"}
                </Button>
              </form>
            )}

            <p className="mt-6 text-center text-xs text-[var(--text-tertiary)]">
              Access is by invitation only. Contact your administrator.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
