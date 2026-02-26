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

      <GlassCard className="max-w-4xl mx-auto overflow-hidden animate-fade-in-up stagger-2 bg-[#060D10]/80 p-0 border border-[#00E5B0]/30 rounded-2xl relative shadow-[0_0_40px_rgba(0,229,176,0.1)] hover:shadow-[0_0_60px_rgba(0,229,176,0.2)] transition-shadow duration-500 backdrop-blur-2xl group">
        <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-[#00E5B0]/10 blur-[100px] pointer-events-none rounded-bl-full" />
        

        {/* Terminal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#00E5B0]/20 bg-[#05070A]/90 relative z-10 font-geist-mono">
           <div className="flex gap-2">
              <div className="w-2 h-2 bg-[#00E5B0] animate-pulse" />
              <div className="w-2 h-2 bg-[#00C2FF]" />
            </div>
          <span className="text-[10px] text-[#00E5B0] tracking-[0.2em] font-bold absolute left-1/2 -translate-x-1/2 uppercase">aivon/workbench</span>
          <div className="flex items-center gap-2">
            <StatusDot animate colorClass="bg-[#00E5B0]" />
            <span className="text-[10px] text-[#00E5B0] uppercase tracking-wider hidden sm:inline">live</span>
          </div>
        </div>

        {/* Progress Rows */}
        <div className="flex flex-col relative z-10 divide-y divide-[#00E5B0]/10">
          {WIP_ITEMS.map((item) => {
            const isHigh = item.progress >= 80;
            const isMed = item.progress >= 50;
            const barColor = isHigh ? "bg-[#00E5B0] shadow-[0_0_15px_rgba(0,229,176,0.5)]" : isMed ? "bg-[#FACC15] shadow-[0_0_15px_rgba(250,204,21,0.5)]" : "bg-[#FB923C] shadow-[0_0_15px_rgba(251,146,60,0.5)]";
            
            return (
              <div key={item.title} className="p-6 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center group hover:bg-[#00E5B0]/5 transition-all duration-300 relative overflow-hidden">
                {/* Scan line effect on row hover */}
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#00E5B0] scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top shadow-[0_0_10px_#00E5B0]" />
                
                <div className="flex items-start gap-4 flex-grow">
                  <span className="font-geist-mono text-[#00E5B0] font-bold pt-0.5 transform group-hover:translate-x-1 transition-transform">$</span>
                  <div className="flex flex-col">
                    <h4 className="font-space-grotesk font-bold text-[15px] text-white group-hover:text-[#00E5B0] transition-colors">{item.title}</h4>
                    <p className="text-[13px] text-[var(--text-secondary)] mt-1 font-geist-sans">{item.description}</p>
                  </div>
                </div>

                <div className="w-full sm:w-56 flex flex-col gap-2 shrink-0">
                  <div className="flex justify-between text-[10px] font-geist-mono text-[#00E5B0]/70 uppercase tracking-widest font-bold">
                    <span>PROGRESS</span>
                    <span className={isHigh ? "text-[#00E5B0]" : "text-[#00C2FF]"}>{item.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#05070A] rounded-full overflow-hidden border border-[#00E5B0]/20">
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
        <div className="px-6 py-5 bg-[#05070A]/90 border-t border-[#00E5B0]/20 font-geist-mono text-xs text-[var(--text-secondary)] relative z-10 flex items-center gap-3">
          <span className="text-[#00E5B0] font-bold shadow-[0_0_5px_#00E5B0]">&gt;</span>
          <span className="text-[#00E5B0] opacity-80 uppercase tracking-wider text-[10px] font-bold">git status --all</span>
          <span className="inline-block w-[8px] h-[15px] bg-[#00E5B0] ml-1 animate-[blink_1s_step-end_infinite] shadow-[0_0_8px_#00E5B0]" />
        </div>
      </GlassCard>
    </section>
  );
}
