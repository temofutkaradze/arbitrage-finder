import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Arbitrage Finder", description: "Personal profit-first product research" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka">
      <body>
        {children}
      </body>
    </html>
  );
}
