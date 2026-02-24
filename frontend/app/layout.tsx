import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aivon — AI-Powered DSA Platform",
  description: "Master Data Structures & Algorithms with AI-powered hints, explanations, and feedback. Solve 2600+ problems from the LeetCode dataset.",
};

import { Providers } from "./providers";
import SessionSync from "@/components/SessionSync";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <SessionSync />
          {children}
        </Providers>
      </body>
    </html>
  );
}
