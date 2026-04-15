import "./globals.css";
import { AppProviders } from "@/components/AppProviders";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Private Onchain Stocks",
  description: "AI-assisted confidential cAAPL protocol dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
