"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

  async function handleSubmit(e: React.FormEvent) {
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
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "var(--background)" }}
      >
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>
          Loading...
        </div>
      </div>
    );
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
            Set Your Password
          </span>
        </div>

        {email && (
          <p
            className="text-sm mb-4 text-center"
            style={{ color: "var(--text-muted)" }}
          >
            Setting password for <span style={{ color: "var(--foreground)" }}>{email}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--foreground)" }}
            >
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LEN}
              autoComplete="new-password"
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--card-border)",
                color: "var(--foreground)",
              }}
              placeholder={`At least ${MIN_PASSWORD_LEN} characters`}
            />
            <p
              className="text-xs mt-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              Must include uppercase, lowercase, number, and symbol.
            </p>
          </div>

          <div>
            <label
              htmlFor="confirm"
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--foreground)" }}
            >
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={MIN_PASSWORD_LEN}
              autoComplete="new-password"
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--card-border)",
                color: "var(--foreground)",
              }}
              placeholder="Re-enter password"
            />
          </div>

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
            disabled={loading || done}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              backgroundColor: "var(--accent)",
              color: "#ffffff",
            }}
          >
            {loading ? "Saving..." : done ? "Saved" : "Set password"}
          </button>
        </form>
      </div>
    </div>
  );
}
