import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const ALLOWED_OTP_TYPES: EmailOtpType[] = [
  "invite",
  "recovery",
  "signup",
  "email",
  "email_change",
];

/**
 * Restrict redirect targets to same-origin relative paths to prevent
 * open-redirect attacks via the `next` query parameter.
 */
function safeNext(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (raw.startsWith("/\\")) return fallback;
  return raw;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const typeParam = url.searchParams.get("type");
  const next = safeNext(url.searchParams.get("next"), "/auth/setup");

  if (!tokenHash || !typeParam) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_link", url.origin)
    );
  }

  if (!ALLOWED_OTP_TYPES.includes(typeParam as EmailOtpType)) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_link", url.origin)
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: typeParam as EmailOtpType,
  });

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=link_expired", url.origin)
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
