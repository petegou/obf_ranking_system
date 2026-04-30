"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

  async function handleSignIn(e: React.FormEvent) {
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

  async function handleSendReset(e: React.FormEvent) {
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
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--background)" }}
    >
      <div
        className="w-full max-w-md rounded-xl border p-8"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
        }}
      >
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--accent)" }}
          >
            Oak Bridge
          </h1>
          <span
            className="text-sm font-medium tracking-wide uppercase"
            style={{ color: "var(--gold)" }}
          >
            Fund Rankings
          </span>
        </div>

        {resetSent ? (
          <div
            className="text-sm rounded-lg px-3 py-3 text-center"
            style={{
              backgroundColor: "var(--accent-muted)",
              color: "var(--foreground)",
            }}
          >
            If an account exists for that email, a password reset link has been sent.
          </div>
        ) : (
          <form
            onSubmit={resetMode ? handleSendReset : handleSignIn}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--foreground)" }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--card-border)",
                  color: "var(--foreground)",
                }}
                placeholder="you@example.com"
              />
            </div>

            {!resetMode && (
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--foreground)" }}
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--card-border)",
                    color: "var(--foreground)",
                  }}
                  placeholder="Enter your password"
                />
              </div>
            )}

            {error && (
              <div
                className="text-sm rounded-lg px-3 py-2"
                style={{
                  backgroundColor: "rgba(220, 38, 38, 0.1)",
                  color: "#dc2626",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: "var(--accent)",
                color: "#ffffff",
              }}
            >
              {loading
                ? resetMode
                  ? "Sending..."
                  : "Signing in..."
                : resetMode
                ? "Send reset link"
                : "Sign In"}
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setResetMode(!resetMode);
              }}
              className="w-full text-xs underline transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              {resetMode ? "Back to sign in" : "Forgot password?"}
            </button>
          </form>
        )}

        <p
          className="text-xs text-center mt-6"
          style={{ color: "var(--text-muted)" }}
        >
          Access is by invitation only. Contact your administrator.
        </p>
      </div>
    </div>
  );
}
