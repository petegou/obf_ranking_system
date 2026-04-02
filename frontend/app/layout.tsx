import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { NavHeader } from "@/components/nav-header";
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
        <Providers>
          <NavHeader />
          <main className="flex-1">{children}</main>
        </Providers>
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
