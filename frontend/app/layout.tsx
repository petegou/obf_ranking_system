import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { NavHeader } from "@/components/nav-header";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

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
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
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
