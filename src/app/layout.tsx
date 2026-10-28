import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "Arbitrage Finder", description: "Personal profit-first product research" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <b>Arbitrage Finder</b>
          <nav><Link href="/">Overview</Link><Link href="/discovery">Discovery</Link><Link href="/research">Research</Link><Link href="/opportunities">Opportunities</Link><Link href="/markets">Markets</Link></nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
