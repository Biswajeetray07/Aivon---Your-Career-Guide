"use client";

import { useTypewriter } from "@/hooks/use-typewriter";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useLiveSocket } from "@/hooks/useLiveSocket";

export function HeroSection() {
  const { data: session, status } = useSession();
  const dynamicText = useTypewriter([
    "software engineers",
    "problem solvers",
    "systems thinkers",
    "AI-powered minds"
  ], 80, 40, 2000);

  const [globalExecutions, setGlobalExecutions] = useState(1337);
  const { listen } = useLiveSocket(["marketing_stats"]);

  useEffect(() => {
    const unlisten = listen("system_activity", (payload) => {
      if (payload?.type === "submission_solved") {
        setGlobalExecutions(prev => prev + 1);
      }
    });
    return unlisten;
  }, [listen]);

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
        
        {/* Fixed height wrapper to prevent typewriter layout jump */}
        <div className="min-h-[200px] sm:min-h-[240px] md:min-h-[300px] flex items-start w-full">
          <h1 className="text-5xl sm:text-6xl md:text-[80px] font-space-grotesk font-black leading-[1.05] tracking-tight stagger-2 animate-fade-in-up">
            Forging digital <br />
            <span className="text-[#00E5B0] drop-shadow-[0_0_8px_rgba(0,229,176,0.3)]">
              {dynamicText}
            </span>
            <span className="inline-block w-[16px] sm:w-[20px] md:w-[24px] h-[40px] sm:h-[50px] md:h-[64px] bg-[#00E5B0] ml-2 animate-[blink_1s_step-end_infinite] shadow-[0_0_15px_#00E5B0] align-middle -mt-2 sm:-mt-4" />
          </h1>
        </div>
        
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
                  <button className="h-14 px-8 rounded-lg relative overflow-hidden group bg-transparent border border-[#00E5B0]/30 text-[#00E5B0] font-space-grotesk font-bold uppercase tracking-[0.1em] transition-all duration-300 flex items-center justify-center gap-3 hover:bg-[#00E5B0]/10 hover:border-[#00E5B0]/80 hover:text-white hover:shadow-sm">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00E5B0]/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <span className="w-1.5 h-1.5 bg-[#00E5B0] rounded-full group-hover:animate-ping z-10" />
                    <span className="z-10 relative">ENTER DASHBOARD</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform z-10 relative" />
                  </button>
                </Link>
                <Link href="/logout">
                  <button className="h-14 px-8 rounded-lg bg-transparent text-[var(--text-secondary)] font-bold font-space-grotesk tracking-widest uppercase text-xs border border-white/10 transition-all duration-300 hover:border-[#00C2FF]/50 hover:text-[#00C2FF] hover:bg-[#00C2FF]/5">
                    ABORT SESSION
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <Link href="/sign-in">
              <button className="h-14 px-8 rounded-lg relative overflow-hidden group bg-transparent border border-[#00E5B0]/30 text-[#00E5B0] font-space-grotesk font-bold uppercase tracking-[0.1em] transition-all duration-300 flex items-center justify-center gap-3 hover:bg-[#00E5B0]/10 hover:border-[#00E5B0]/80 hover:text-white hover:shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00E5B0]/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="w-1.5 h-1.5 bg-[#00E5B0] rounded-full group-hover:animate-ping z-10" />
                <span className="z-10 relative">SIGN IN TO DASHBOARD</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform z-10 relative" />
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Right Content - ASCI/Terminal Card */}
      <div className="relative z-10 w-full max-w-2xl mx-auto lg:mx-0 stagger-5 animate-fade-in-up mt-12 lg:mt-0 flex justify-end">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#00E5B0]/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="glass border border-[#00E5B0]/30 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,229,176,0.1)] relative group transform transition-transform duration-700 hover:scale-[1.02] w-full max-w-[600px] bg-[#060D10]/80 backdrop-blur-2xl">
          
          {/* Cyber Header */}
          <div className="px-5 py-4 border-b border-[#00E5B0]/20 flex items-center justify-between bg-[#05070A]/90 relative z-10">
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-[#00E5B0] animate-pulse" />
              <div className="w-2 h-2 bg-[#00C2FF]" />
            </div>
            <span className="text-[10px] font-geist-mono text-[#00E5B0] tracking-[0.2em] font-bold">
              terminal://aivon
            </span>
          </div>
          
          {/* Terminal Body */}
          <div className="p-8 md:p-10 font-geist-mono text-sm sm:text-[15px] text-white leading-tight whitespace-pre overflow-x-auto relative">
{`    ___    _____    __  __   ____    _   __ 
   /   |  /  _/  | / / / __ \\ / | / /
  / /| |  / /   \\ V / / / / //  |/ / 
 / ___ |_/ /     | | / /_/ // /|  /  
/_/  |_/___/     |_| \\____//_/ |_/   `}
            <div className="mt-12 text-[var(--text-secondary)] space-y-3 font-geist-mono text-[13px] uppercase tracking-wider">
              <div className="flex gap-4">
                <span className="text-[#00C2FF] font-bold">❯</span>
                <span className="text-[var(--text-muted)]">user:</span>
                <span className="text-white font-bold">{status === "authenticated" ? (session?.user?.name || "authenticated") : "unauthenticated"}</span>
              </div>
              <div className="flex gap-4">
                <span className="text-[#00E5B0] font-bold">❯</span>
                <span className="text-[var(--text-muted)]">status:</span>
                <span className="text-[#00E5B0] drop-shadow-[0_0_5px_#00E5B0]">ONLINE</span>
              </div>
              <div className="flex gap-4 items-center">
                <span className="text-[#00C2FF] font-bold text-lg leading-none">❯</span>
                <span className="text-[var(--text-muted)]">compiler:</span>
                <span className="text-[#00E5B0]">ready_for_execution</span>
              </div>
              <div className="flex gap-4 items-center">
                <span className="text-[#00C2FF] font-bold text-lg leading-none">❯</span>
                <span className="text-[var(--text-muted)]">global_resolves:</span>
                <span className="text-[#00C2FF] drop-shadow-[0_0_5px_#00C2FF] transition-all" key={globalExecutions}>
                  {globalExecutions}
                </span>
                <span className="inline-block w-[8px] h-[15px] bg-[#00E5B0] ml-2 animate-[blink_1s_step-end_infinite] shadow-[0_0_8px_#00E5B0]" />
              </div>
            </div>

            {/* Subtle overlay gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#00E5B0]/0 via-[#00E5B0]/0 to-[#00E5B0]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </div>
        </div>

        {/* Floating Badges */}
        <div className="absolute -top-6 -right-6 px-4 py-1.5 rounded-full border border-[#00E5B0]/50 bg-[#00E5B0]/10 backdrop-blur-md text-[10px] font-mono text-[#00E5B0] font-bold shadow-[0_0_15px_rgba(0,229,176,0.2)] animate-float" style={{ animationDelay: '0s' }}>
          CORE v2.0
        </div>
        <div className="absolute -bottom-4 -left-4 px-4 py-1.5 rounded-full border border-[#00C2FF]/50 bg-[#00C2FF]/10 backdrop-blur-md text-[10px] font-mono text-[#00C2FF] font-bold shadow-[0_0_15px_rgba(0,194,255,0.2)] animate-float" style={{ animationDelay: '2s' }}>
          UPLINK SECURE
        </div>
      </div>

    </section>
  );
}
