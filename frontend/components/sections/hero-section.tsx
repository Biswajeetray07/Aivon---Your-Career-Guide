"use client";

import { useTypewriter } from "@/hooks/use-typewriter";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { useSession } from "next-auth/react";

export function HeroSection() {
  const { data: session, status } = useSession();
  const dynamicText = useTypewriter([
    "software engineers",
    "problem solvers",
    "systems thinkers",
    "AI-powered minds"
  ], 80, 40, 2000);

  return (
    <section className="relative pt-32 sm:pt-40 pb-20 lg:pt-48 lg:pb-32 container mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      
      {/* Left Content */}
      <div className="flex flex-col gap-6 z-10 w-full max-w-2xl">
        <div className="flex items-center gap-4">
          <div className="h-[2px] w-12 bg-[#00E5B0]" />
          <span className="font-geist-mono text-xs uppercase tracking-[0.2em] text-[#00E5B0] font-bold stagger-1 animate-fade-in-up">
            AIVON — WHERE CODE MEETS CURIOSITY
          </span>
        </div>
        
        <h1 className="text-5xl sm:text-6xl md:text-[80px] font-space-grotesk font-black leading-[1.05] tracking-tight stagger-2 animate-fade-in-up">
          Forging digital <br />
          <span className="text-[#00E5B0] inline-flex items-center">
            {dynamicText}
            <span className="inline-block w-[24px] h-[64px] bg-[#00E5B0] ml-2 animate-[blink_1s_step-end_infinite]" />
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-[var(--text-secondary)] mt-6 max-w-xl stagger-3 animate-fade-in-up leading-relaxed font-geist-sans">
          Welcome to the Aivon Laboratory — a space for experimental remote 
          code execution, algorithmic problem solving, and Socratic mentorship 
          powered by local intelligence.
        </p>
        
        <div className="flex flex-wrap items-center gap-6 mt-10 stagger-4 animate-fade-in-up">
          {status === "loading" ? (
            <div className="h-14 w-56 bg-[var(--border)] animate-pulse rounded-xl" />
          ) : status === "authenticated" ? (
            <div className="flex flex-col gap-5">
              <div className="text-sm font-geist-mono text-[var(--text-secondary)]">
                &gt; Signed in as <span className="text-[#00E5B0] font-bold">{session?.user?.name || "User"}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/dashboard">
                  <button className="h-14 px-8 rounded-xl bg-[#00E5B0] text-black font-bold font-space-grotesk text-lg transition-all duration-300 hover:brightness-110 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(0,229,176,0.4)] flex items-center gap-3 group">
                    Go to Dashboard <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <Link href="/logout">
                  <button className="h-14 px-8 rounded-xl bg-transparent text-[var(--text-primary)] font-bold font-space-grotesk border border-white/10 transition-all duration-300 hover:border-red-500/50 hover:text-red-500 hover:bg-red-500/5 hover:-translate-y-1">
                    Sign Out
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <Link href="/sign-in">
              <button className="h-14 px-8 rounded-xl bg-[#00E5B0] text-black font-bold font-space-grotesk text-lg transition-all duration-300 hover:brightness-110 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(0,229,176,0.4)] flex items-center gap-3 group">
                Sign in to Dashboard <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Right Content - ASCI/Terminal Card */}
      <div className="relative z-10 w-full max-w-2xl mx-auto lg:mx-0 stagger-5 animate-fade-in-up mt-12 lg:mt-0 flex justify-end">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#00E5B0]/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="glass border border-white/6 rounded-2xl overflow-hidden shadow-2xl relative group transform transition-transform duration-700 hover:rotate-1 w-full max-w-[600px] bg-[#0A0F14]/80">
          
          {/* Mac Header */}
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2.5 bg-[#05070A]/80 relative relative z-10">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
            <span className="absolute left-1/2 -translate-x-1/2 text-[11px] font-geist-mono text-[var(--text-muted)] tracking-[0.1em]">
              terminal://aivon
            </span>
          </div>
          
          {/* Terminal Body */}
          <div className="p-8 md:p-10 font-geist-mono text-sm sm:text-[15px] text-[#00E5B0] leading-tight whitespace-pre overflow-x-auto relative">
{`    ___    _____    __  __   ____    _   __ 
   /   |  /  _/  | / / / __ \\ / | / /
  / /| |  / /   \\ V / / / / //  |/ / 
 / ___ |_/ /     | | / /_/ // /|  /  
/_/  |_/___/     |_| \\____//_/ |_/   `}
            <div className="mt-12 text-[var(--text-secondary)] space-y-3 font-geist-mono text-[13px]">
              <div className="flex gap-4">
                <span className="text-[#00E5B0] font-bold">❯</span>
                <span className="text-white opacity-90">user:</span>
                <span className="opacity-70">{status === "authenticated" ? (session?.user?.name || "authenticated") : "unauthenticated"}</span>
              </div>
              <div className="flex gap-4">
                <span className="text-[#00E5B0] font-bold">❯</span>
                <span className="text-white opacity-90">status:</span>
                <span className="text-[#00E5B0]">ONLINE</span>
              </div>
              <div className="flex gap-4">
                <span className="text-[#00E5B0] font-bold">❯</span>
                <span className="text-white opacity-90">compiler:</span>
                <span className="opacity-70">ready_for_execution</span><span className="inline-block w-[8px] h-[15px] bg-[var(--text-muted)] ml-2 animate-[blink_1s_step-end_infinite]" />
              </div>
            </div>

            {/* Subtle overlay gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#00E5B0]/0 via-[#00E5B0]/0 to-[#00E5B0]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </div>
        </div>

        {/* Floating Badges */}
        <div className="absolute -top-6 -right-6 px-4 py-1.5 rounded-full border border-[var(--primary)]/30 bg-[var(--card)]/90 backdrop-blur-md text-[10px] font-mono text-[var(--primary)] animate-float" style={{ animationDelay: '0s' }}>
          v2.0.0
        </div>
        <div className="absolute -bottom-4 -left-4 px-4 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md text-[10px] font-mono text-[var(--text-secondary)] animate-float" style={{ animationDelay: '2s' }}>
          EST. 2026
        </div>
      </div>

    </section>
  );
}
