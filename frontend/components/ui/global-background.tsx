"use client";

import { usePathname } from "next/navigation";
import { HackerNetworkBackground } from "./hacker-network-background";
import { SpiderWebBackground } from "./spiderweb-background";

export function GlobalBackground() {
  const pathname = usePathname();

  const isAuthPage = 
    pathname.includes("/sign-in") || 
    pathname.includes("/sign-up") || 
    pathname.includes("/onboarding") ||
    pathname.includes("/logout");

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {isAuthPage ? (
        // Spiderman themed for Auth Auth pages
        <SpiderWebBackground variant="default" />
      ) : (
        // Hacker Network Matrix Rain for all other pages
        <HackerNetworkBackground />
      )}
    </div>
  );
}