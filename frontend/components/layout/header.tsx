"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getSession } from "@/lib/api";
import { ThemeToggle } from "@/components/core/theme-toggle";
import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/ui/badge";
import { Menu, X, LogOut, Lock } from "lucide-react";
import Image from "next/image";

const NAV_LINKS = [
  { href: "/problems", label: "Arena", protected: true },
  { href: "/leaderboard", label: "Leaderboard", protected: true },
];

export function Header() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<{name?: string; rating?: number; avatar?: string} | null>(null);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll);
    
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, []);

  // Sync our detailed backend user profile when NextAuth confirms auth
  useEffect(() => {
    async function loadBackendProfile() {
      // Small timeout to allow SessionSync to write to localStorage
      await new Promise(r => setTimeout(r, 100));
      try {
        const { user: backendUser } = await getSession();
        setUser(backendUser as { name?: string; rating?: number; avatar?: string } | null);
      } catch {
        // Fallback to NextAuth user data if the backend call fails
        setUser({
          name: session?.user?.name || "Anon",
          rating: 1200, 
          avatar: session?.user?.image || undefined
        });
      }
    }

    if (status === "authenticated") {
      loadBackendProfile();
    } else if (status === "unauthenticated") {
      setUser(null);
    }
  }, [status, session]);

  // Use the event listener fallback for token changes just in case
  useEffect(() => {
    const onTokenChange = async () => {
      try {
        const { user: backendUser } = await getSession();
        setUser(backendUser as { name?: string; rating?: number; avatar?: string } | null);
      } catch {
        // Ignore
      }
    };
    window.addEventListener("aivon_token_changed", onTokenChange);
    return () => window.removeEventListener("aivon_token_changed", onTokenChange);
  }, []);

  if (!mounted) return null;

  // Don't show header on immersive flows and specific problem pages
  if (pathname === "/onboarding" || pathname === "/sign-in" || pathname === "/sign-up" || pathname.startsWith("/problems/")) {
    return null;
  }
  
  // Decide what user object to render: use state if available, fallback to basic NextAuth session info to guarantee it never shows "Sign In" briefly
  const displayUser = user || (status === "authenticated" ? { name: session?.user?.name || "Anon", rating: 1200, avatar: session?.user?.image || undefined } : null);

  return (
    <header className={cn(
      "fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-5xl z-50 transition-all duration-500 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
      scrolled ? "backdrop-blur-xl bg-[#0A0F14]/80 py-3 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]" : "bg-[#05070A]/40 backdrop-blur-md py-4"
    )}>
      <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
        
        {/* Logo */}
        <Link href={status === "authenticated" ? "/dashboard" : "/"} className="flex items-center gap-3 group text-decoration-none hover:scale-105 transition-transform">
          <span className="text-xl flex items-center justify-center w-8 h-8 rounded-lg text-[#FACC15] drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">⚡</span>
          <span className="font-bold text-lg tracking-tight font-space-grotesk text-white">AIVON</span>
        </Link>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link, idx) => {
            const isActive = pathname === link.href;
            const isLocked = status !== "authenticated" && link.protected;
            
            return (
              <Link
                key={link.href}
                href={isLocked ? "/sign-in" : link.href}
                title={isLocked ? "Sign in required" : undefined}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={cn(
                  "relative text-sm font-medium transition-colors font-space-grotesk flex items-center gap-1.5",
                  isActive ? "text-[var(--primary)]" : "text-[var(--text-secondary)] hover:text-[#00E5B0]"
                )}
              >
                <span className={cn(
                  "font-mono text-[var(--text-muted)] transition-opacity duration-200",
                  hoveredIdx === idx ? "opacity-100 text-[#00E5B0]" : "opacity-0"
                )}>
                  [
                </span>
                <span className="flex items-center">
                  {link.label}
                  {isLocked && <Lock size={12} className="ml-2 opacity-50" />}
                </span>
                <span className={cn(
                  "font-mono text-[var(--text-muted)] transition-opacity duration-200",
                  hoveredIdx === idx ? "opacity-100 text-[#00E5B0]" : "opacity-0"
                )}>
                  ]
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Right Side */}
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1 bg-[#05070A]/80 border-l-2 border-[#00E5B0]">
            <StatusDot animate colorClass="bg-[#00E5B0]" />
            <span className="text-[10px] font-geist-mono text-[#00E5B0] uppercase tracking-widest hidden lg:block">SYS: ONLINE</span>
          </div>

          <ThemeToggle />

          <div className="w-[1px] h-6 bg-[var(--border)]" />

          {status === "loading" ? (
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-24 h-4 bg-[var(--border)] rounded" />
              <div className="w-9 h-9 rounded-full bg-[var(--border)]" />
            </div>
          ) : displayUser ? (
            <div className="flex items-center gap-4">
              <Link href="/profile" className="flex items-center gap-3 group bg-[#060D10] border border-white/5 hover:border-[#00E5B0]/30 transition-colors pr-3 pl-1 py-1 rounded-sm">
                <div className="w-8 h-8 rounded-sm bg-[#05070A] border border-[#00E5B0]/20 flex items-center justify-center overflow-hidden relative grayscale group-hover:grayscale-0 transition-all">
                  {displayUser.avatar ? (
                    <Image src={displayUser.avatar} alt="Avatar" fill className="object-cover" />
                  ) : (
                    <span className="text-sm">👾</span>
                  )}
                </div>
                <div className="flex flex-col items-start justify-center">
                  <span className="text-xs font-bold text-white group-hover:text-[#00E5B0] transition-colors uppercase tracking-wider leading-none">{displayUser.name || "Anon"}</span>
                  <span className="text-[9px] text-[var(--text-muted)] font-mono leading-none mt-1">LVL: {displayUser.rating}</span>
                </div>
              </Link>
              <Link 
                href="/logout" 
                className="p-2 border border-white/5 hover:border-[#FF5F56]/50 text-[var(--text-muted)] hover:text-[#FF5F56] transition-all bg-[#05070A] rounded-sm flex items-center justify-center"
                title="Disconnect Neural Link"
              >
                <LogOut size={16} />
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/sign-in" className="text-sm font-semibold text-[var(--text-secondary)] hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/sign-up" className="text-sm font-semibold text-black bg-white px-6 py-2 rounded-full hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden p-2 text-[var(--text-secondary)]" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="absolute top-full left-0 w-full bg-[var(--background)] border-b border-[var(--border)] py-4 px-6 flex flex-col gap-4 md:hidden animate-fade-in-down shadow-2xl">
          {NAV_LINKS.map((link) => {
            const isLocked = status !== "authenticated" && link.protected;
            return (
              <Link key={link.href} href={isLocked ? "/sign-in" : link.href} onClick={() => setMobileOpen(false)} className="text-lg font-medium text-[var(--text-secondary)] hover:text-[var(--primary)] flex items-center gap-2">
                {link.label}
                {isLocked && <Lock size={14} className="opacity-50" />}
              </Link>
            );
          })}
          <div className="w-full h-[1px] bg-[var(--border)] my-2" />
          {displayUser ? (
            <div className="flex flex-col gap-4">
              <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center justify-between w-full p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl">
                 <span className="font-semibold">{displayUser.name || "Anon"}</span>
                 <span className="text-[12px] text-[var(--accent-cyan)] font-mono">{displayUser.rating} ELO</span>
              </Link>
              <Link href="/logout" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 text-red-500 font-medium p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                 <LogOut size={18} />
                 <span>Disconnect Neural Link</span>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-2">
              <Link href="/sign-in" onClick={() => setMobileOpen(false)} className="text-center w-full font-semibold text-[var(--text-primary)] bg-[var(--card)] border border-[var(--border)] px-4 py-3 rounded-xl">
                Sign In
              </Link>
              <Link href="/sign-up" onClick={() => setMobileOpen(false)} className="text-center w-full font-semibold text-[var(--background)] bg-[var(--primary)] px-4 py-3 rounded-xl">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
