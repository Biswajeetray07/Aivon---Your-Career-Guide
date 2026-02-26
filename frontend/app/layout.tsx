import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk, VT323 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });
const vt323 = VT323({ variable: "--font-vt323", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aivon — AI-Powered DSA Platform",
  description: "Master Data Structures & Algorithms with AI-powered hints, explanations, and feedback.",
};

import { Providers } from "./providers";
import SessionSync from "@/components/SessionSync";
import { CursorGlow } from "@/components/core/cursor-glow";
import { Header } from "@/components/layout/header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalBackground } from "@/components/ui/global-background";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${vt323.variable} antialiased bg-[#05070A] text-[var(--text-primary)] min-h-screen relative overflow-x-hidden`} suppressHydrationWarning>
        <GlobalBackground />
        <Providers>
          <div className="relative z-10 flex flex-col min-h-screen scanlines">
            <Header />
            <SessionSync />
            <TooltipProvider>
              <div className="flex-1 w-full pt-0">
                {children}
              </div>
            </TooltipProvider>
          </div>
          <CursorGlow />
        </Providers>
      </body>
    </html>
  );
}
