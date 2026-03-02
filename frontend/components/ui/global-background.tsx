"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// Lazy-load the heavy canvas backgrounds — they are NOT needed for initial paint
const HackerNetworkBackground = dynamic(
  () => import("./hacker-network-background").then(m => ({ default: m.HackerNetworkBackground })),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-[#05070A]" /> }
);

const SpiderWebBackground = dynamic(
  () => import("./spiderweb-background").then(m => ({ default: m.SpiderWebBackground })),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-[#05070A]" /> }
);

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
        <SpiderWebBackground variant="default" />
      ) : (
        <HackerNetworkBackground />
      )}
    </div>
  );
}