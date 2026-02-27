"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/ui/badge";
import { Menu, X, LogOut, Lock } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { Transition } from "framer-motion";

const NAV_LINKS = [
  { href: "/problems", label: "Problems", protected: true },
  { href: "/arena", label: "Arena", protected: true },
  { href: "/leaderboard", label: "Leaderboard", protected: true },
  { href: "/chat", label: "Aivon Nexus", protected: true },
];

export function Header() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    // Check initial scroll state
    onScroll();
    
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!mounted) return null;

  // Hide on immersive full-screen flows
  if (
    pathname === "/onboarding" ||
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname.startsWith("/problems/")
  ) {
    return null;
  }

  const displayUser = status === "authenticated" && session?.user ? { 
    name: session.user.name || "Anon", 
    rating: 1200, 
    avatar: session.user.image || undefined 
  } : null;

  const animState = scrolled ? "compressed" : "expanded";
  const springTransition: Transition = { duration: 0.35, ease: "easeOut" };

  return (
    <motion.header 
      initial={false}
      animate={animState}
      variants={{
        expanded: {
          height: 72,
          paddingLeft: "28px",
          paddingRight: "28px",
          borderRadius: 20,
          backgroundColor: "rgba(5, 7, 10, 0.4)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)"
        },
        compressed: {
          height: 64,
          paddingLeft: "24px",
          paddingRight: "24px",
          borderRadius: 16,
          backgroundColor: "rgba(10, 15, 20, 0.8)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.5)"
        }
      }}
      transition={springTransition}
      className="fixed left-1/2 -translate-x-1/2 top-4 w-[calc(100%-2rem)] max-w-5xl z-50 flex flex-col justify-center overflow-visible"
    >
      <div className="flex items-center justify-between w-full h-full relative">
        
        {/* Left: Logo */}
        <Link href={status === "authenticated" ? "/dashboard" : "/"} className="flex items-center gap-3 group text-decoration-none hover:scale-105 transition-transform shrink-0">
          <span className="text-xl flex items-center justify-center w-8 h-8 rounded-lg text-[#0AB6BC] drop-shadow-[0_0_8px_rgba(10,182,188,0.5)]">⚡</span>
          <span className="font-bold text-lg tracking-tight font-space-grotesk text-white">AIVON</span>
        </Link>
        
        {/* Center: Adaptive Nav */}
        <motion.nav 
          initial={false}
          animate={animState}
          variants={{
            expanded: { gap: 20 },
            compressed: { gap: 18 }
          }}
          transition={springTransition}
          className="hidden md:flex items-center whitespace-nowrap"
        >
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
                className="relative flex items-center group/link shrink-0 focus:outline-none"
              >
                {/* Subtle Neon Glow */}
                <div className="absolute inset-0 bg-[#0AB6BC]/0 group-hover/link:bg-[#0AB6BC]/10 transition-colors duration-300 rounded-md -mx-3 -my-1.5" />
                
                <span className={cn(
                  "font-mono text-[var(--text-muted)] transition-opacity duration-200 mr-1.5",
                  hoveredIdx === idx ? "opacity-100 text-[#0AB6BC]" : "opacity-0"
                )}>
                  [
                </span>
                
                <motion.span
                  initial={false}
                  animate={animState}
                  variants={{
                    expanded: { fontSize: "13px", letterSpacing: "0.01em" },
                    compressed: { fontSize: "13px", letterSpacing: "0.01em" }
                  }}
                  transition={springTransition}
                  className={cn(
                    "font-medium transition-colors font-space-grotesk flex items-center relative z-10",
                    isActive ? "text-[#0AB6BC]" : "text-[var(--text-secondary)] group-hover/link:text-white"
                  )}
                >
                  {link.label}
                  {isLocked && <Lock size={12} className="ml-2 opacity-50" />}
                </motion.span>
                
                <span className={cn(
                  "font-mono text-[var(--text-muted)] transition-opacity duration-200 ml-1.5",
                  hoveredIdx === idx ? "opacity-100 text-[#0AB6BC]" : "opacity-0"
                )}>
                  ]
                </span>
              </Link>
            );
          })}
        </motion.nav>

        {/* Right: User Profile & Actions */}
        <div className="hidden md:flex items-center gap-6 shrink-0">
          <div className={cn("flex items-center gap-2 px-3 py-1.5 bg-[#05070A]/80 border-l-2 rounded-sm", status === "authenticated" ? "border-[#0AB6BC] shadow-[0_0_10px_rgba(10,182,188,0.1)]" : "border-[#FF5F56]")}>
            <StatusDot animate={status === "authenticated"} colorClass={status === "authenticated" ? "bg-[#0AB6BC]" : "bg-[#FF5F56]"} />
            <motion.span 
              initial={false}
              animate={animState}
              variants={{
                expanded: { fontSize: "10px" },
                compressed: { fontSize: "9px" }
              }}
              className={cn("font-geist-mono uppercase tracking-widest hidden lg:block", status === "authenticated" ? "text-[#0AB6BC]" : "text-[#FF5F56]")}
            >
              {status === "authenticated" ? "SYS: ONLINE" : "SYS: OFFLINE"}
            </motion.span>
          </div>

          <div className="w-[1px] h-6 bg-white/10" />

          {status === "loading" ? (
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-24 h-4 bg-white/10 rounded" />
              <div className="w-9 h-9 rounded-full bg-white/10" />
            </div>
          ) : displayUser ? (
            <div className="flex items-center gap-4">
              <Link href="/profile" className="flex items-center gap-3 group bg-[#060D10]/50 border border-white/5 hover:border-[#0AB6BC]/40 hover:bg-[#0AB6BC]/5 transition-all pr-4 pl-1.5 py-1.5 rounded-full backdrop-blur-md">
                <div className="w-7 h-7 rounded-full bg-[#05070A] border border-[#0AB6BC]/20 flex items-center justify-center overflow-hidden relative grayscale group-hover:grayscale-0 transition-all">
                  {displayUser.avatar ? (
                    <Image src={displayUser.avatar} alt="Avatar" fill className="object-cover" />
                  ) : (
                    <span className="text-xs">👾</span>
                  )}
                </div>
                <div className="flex flex-col items-start justify-center overflow-hidden max-w-[80px]">
                  <span className="text-[11px] font-bold text-white group-hover:text-[#0AB6BC] transition-colors uppercase tracking-wider leading-none truncate w-full">{displayUser.name || "Anon"}</span>
                  <span className="text-[8px] text-[var(--text-muted)] group-hover:text-[#0AB6BC]/70 font-mono leading-none mt-1 truncate w-full">LVL: {displayUser.rating}</span>
                </div>
              </Link>
              <Link 
                href="/logout" 
                className="w-9 h-9 border border-white/5 hover:border-[#FF5F56]/50 text-[var(--text-muted)] hover:text-[#FF5F56] hover:bg-[#FF5F56]/10 transition-all bg-[#05070A]/50 backdrop-blur-md rounded-full flex items-center justify-center shrink-0"
                title="Disconnect Neural Link"
              >
                <LogOut size={14} className="translate-x-[1px]" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/sign-in" className="text-xs font-bold text-[var(--text-secondary)] hover:text-white uppercase tracking-wider transition-colors">
                Sign In
              </Link>
              <Link href="/sign-up" className="text-xs font-bold font-space-grotesk text-black bg-white px-5 py-2.5 rounded-full hover:scale-105 hover:bg-[#0AB6BC] transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] uppercase tracking-wider">
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden p-2 text-[var(--text-secondary)] hover:text-white transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 w-full mt-4 bg-[#0A0F14]/95 backdrop-blur-xl border border-white/10 p-6 flex flex-col gap-4 md:hidden rounded-2xl shadow-2xl"
          >
            {NAV_LINKS.map((link) => {
              const isLocked = status !== "authenticated" && link.protected;
              return (
                <Link key={link.href} href={isLocked ? "/sign-in" : link.href} onClick={() => setMobileOpen(false)} className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[#0AB6BC] flex items-center gap-2 border-b border-white/5 pb-3">
                  {link.label}
                  {isLocked && <Lock size={12} className="opacity-50" />}
                </Link>
              );
            })}
            {displayUser ? (
              <div className="flex flex-col gap-3 mt-2">
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center justify-between w-full p-4 bg-[#05070A] border border-white/5 rounded-xl hover:border-[#0AB6BC]/30 transition-colors">
                   <span className="font-bold uppercase tracking-wider text-sm">{displayUser.name || "Anon"}</span>
                   <span className="text-[10px] text-[#0AB6BC] font-mono tracking-widest">LVL: {displayUser.rating}</span>
                </Link>
                <Link href="/logout" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 text-[#FF5F56] text-xs font-bold uppercase tracking-widest p-4 bg-[#FF5F56]/5 border border-[#FF5F56]/20 rounded-xl hover:bg-[#FF5F56]/10 transition-colors">
                   <LogOut size={14} />
                   <span>Disconnect</span>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-2">
                <Link href="/sign-in" onClick={() => setMobileOpen(false)} className="text-center w-full font-bold uppercase tracking-widest text-[11px] bg-[#05070A] text-white border border-white/10 px-4 py-4 rounded-xl hover:border-[#0AB6BC]/50 transition-colors">
                  Sign In
                </Link>
                <Link href="/sign-up" onClick={() => setMobileOpen(false)} className="text-center w-full font-bold uppercase tracking-widest text-[11px] text-black bg-white px-4 py-4 rounded-xl hover:bg-[#0AB6BC] transition-colors">
                  Sign Up
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
