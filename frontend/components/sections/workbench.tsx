"use client";

import { WIP_ITEMS } from "@/lib/data";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusDot } from "@/components/ui/badge";

export function Workbench() {
  return (
    <section className="relative py-20 lg:py-32 container mx-auto px-6 md:px-12">
      <div className="mb-16 stagger-1 animate-fade-in-up">
        <h2 className="text-3xl md:text-4xl font-space-grotesk font-bold tracking-tight text-gradient inline-block">Workbench</h2>
        <p className="text-[var(--text-secondary)] mt-2 text-sm font-mono uppercase tracking-wider">Active experiments, test protocols, and things that are breaking (so you don&apos;t have to).</p>
      </div>

      <GlassCard className="max-w-4xl mx-auto overflow-hidden animate-fade-in-up stagger-2 bg-[var(--card)]/40 p-0 border border-[var(--border)] relative shadow-xl hover:shadow-[0_0_40px_var(--glow-color)] transition-shadow duration-500">
        <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-[var(--primary)]/5 blur-3xl pointer-events-none rounded-bl-full" />
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#05070A]/80 relative z-10 font-geist-mono">
           <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56] hover:brightness-110 transition-all cursor-pointer shadow-[0_0_8px_#FF5F56]" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:brightness-110 transition-all cursor-pointer shadow-[0_0_8px_#FFBD2E]" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F] hover:brightness-110 transition-all cursor-pointer shadow-[0_0_8px_#27C93F]" />
          </div>
          <span className="text-xs text-[var(--text-muted)] tracking-wider absolute left-1/2 -translate-x-1/2">~/aivon/workbench</span>
          <div className="flex items-center gap-2">
            <StatusDot animate colorClass="bg-[#00E5B0]" />
            <span className="text-[10px] text-[#00E5B0] uppercase tracking-wider hidden sm:inline">live</span>
          </div>
        </div>

        {/* Progress Rows */}
        <div className="flex flex-col relative z-10 divide-y divide-white/5">
          {WIP_ITEMS.map((item) => {
            const isHigh = item.progress >= 80;
            const isMed = item.progress >= 50;
            const barColor = isHigh ? "bg-[#00E5B0] shadow-[0_0_15px_rgba(0,229,176,0.3)]" : isMed ? "bg-[#FACC15] shadow-[0_0_15px_rgba(250,204,21,0.3)]" : "bg-[#FB923C] shadow-[0_0_15px_rgba(251,146,60,0.3)]";
            
            return (
              <div key={item.title} className="p-6 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center group hover:bg-[#0A0F14]/80 transition-all duration-300">
                
                <div className="flex items-start gap-4 flex-grow">
                  <span className="font-geist-mono text-[#00E5B0] font-bold pt-0.5 transform group-hover:translate-x-1 transition-transform">$</span>
                  <div className="flex flex-col">
                    <h4 className="font-space-grotesk font-bold text-[15px] text-white group-hover:text-[#00E5B0] transition-colors">{item.title}</h4>
                    <p className="text-[13px] text-[var(--text-secondary)] mt-1 font-geist-sans">{item.description}</p>
                  </div>
                </div>

                <div className="w-full sm:w-56 flex flex-col gap-2 shrink-0">
                  <div className="flex justify-between text-[10px] font-geist-mono text-[var(--text-muted)] uppercase tracking-wider">
                    <span>PROGRESS</span>
                    <span className={isHigh ? "text-[#00E5B0] font-bold" : "text-[var(--text-secondary)]"}>{item.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#05070A] rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full ${barColor} relative overflow-hidden transition-all duration-1000 ease-out`}
                      style={{ width: `${item.progress}%` }}
                    >
                      <div className="absolute inset-0 w-[200%] animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                    </div>
                  </div>
                </div>
                
              </div>
            );
          })}
        </div>

        {/* Terminal Footer */}
        <div className="px-6 py-5 bg-[#05070A]/80 border-t border-white/5 font-geist-mono text-xs text-[var(--text-secondary)] relative z-10 flex items-center gap-3">
          <span className="text-[#00E5B0] font-bold">&gt;</span>
          <span className="text-white opacity-80">git status --all</span>
          <span className="inline-block w-[8px] h-[15px] bg-[#00E5B0] ml-1 animate-[blink_1s_step-end_infinite]" />
        </div>
      </GlassCard>
    </section>
  );
}
