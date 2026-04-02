import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oak Bridge Fund Rankings",
  description:
    "Multi-factor scoring and ranking engine for mutual funds and ETFs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
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
              <Link
                href="/formulas"
                className="text-sm font-medium no-underline hover:underline"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                Formulas
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer
          className="border-t text-center py-4 text-sm"
          style={{
            borderColor: "var(--card-border)",
            color: "var(--text-muted)",
          }}
        >
          Oak Bridge Financial &mdash; Rankings are decision-support tools, not
          absolute selections.
        </footer>
      </body>
    </html>
  );
}
