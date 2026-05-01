import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
  const themeScript = `
    (() => {
      const key = "obf-theme";
      const stored = (() => {
        try { return localStorage.getItem(key); } catch { return null; }
      })();
      const mode = stored === "light" || stored === "dark" || stored === "auto"
        ? stored
        : "auto";
      const resolved = mode === "auto"
        ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : mode;
      document.documentElement.dataset.theme = mode;
      document.documentElement.classList.toggle("dark", resolved === "dark");
    })();
  `;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-[var(--surface-base)] text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}
