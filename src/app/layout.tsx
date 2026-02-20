import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "youtube.9180.net",
  description: "YouTube channel intelligence and content planning",
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/discover", label: "发现" },
  { href: "/similar", label: "同类" },
  { href: "/planner", label: "文案" },
  { href: "/tracker", label: "追踪" },
  { href: "/reports", label: "周报" },
  { href: "/version", label: "版本解释" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-sm font-semibold text-zinc-900">team-content-os</Link>
            <nav className="flex flex-wrap items-center gap-2 text-sm">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-zinc-700 hover:bg-zinc-50">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
