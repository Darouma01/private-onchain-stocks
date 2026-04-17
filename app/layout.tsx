import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { AppProviders } from "@/components/AppProviders";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Private Onchain Stocks | Confidential DeFi on Arbitrum",
  description: "Trade 61 confidential assets with encrypted balances powered by iExec Nox Protocol",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Private Onchain Stocks | Confidential DeFi on Arbitrum",
    description: "Trade 61 confidential assets with encrypted balances powered by iExec Nox Protocol",
    images: [{ url: "/favicon.svg", width: 64, height: 64, alt: "Private Onchain Stocks lock icon" }],
  },
  twitter: {
    card: "summary",
    title: "Private Onchain Stocks | Confidential DeFi on Arbitrum",
    description: "Trade 61 confidential assets with encrypted balances powered by iExec Nox Protocol",
    images: ["/favicon.svg"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
