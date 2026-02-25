"use client";
import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { LAB_NOTES } from "@/lib/data";
import { ChevronRight } from "lucide-react";

export function LabNotes() {
  const [expandedNote, setExpandedNote] = useState<number | null>(null);

  return (
    <section className="relative py-20 lg:py-32 container mx-auto px-6 md:px-12">
      <div className="mb-16 stagger-1 animate-fade-in-up">
        <h2 className="text-3xl md:text-4xl font-space-grotesk font-black tracking-tight text-white">Lab Notes</h2>
        <p className="text-[var(--text-secondary)] mt-2 text-[13px] font-geist-mono uppercase tracking-wider">Brief observations, technical findings, and theories from the workbench.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        {/* Decorative connecting line */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[var(--border)] to-transparent" />
        
        {LAB_NOTES.map((note, idx) => {
          const isExpanded = expandedNote === note.id;
          return (
            <GlassCard
              key={note.id}
              onClick={() => setExpandedNote(isExpanded ? null : note.id)}
              className={`p-6 md:p-8 flex flex-col cursor-pointer group transition-all duration-300 animate-fade-in-up ${isExpanded ? "border-[#00E5B0] scale-[1.02] shadow-[0_0_30px_rgba(0,229,176,0.15)] z-10 bg-[#0A0F14]" : "hover:border-white/10 bg-[#0A0F14]/60 border-white/5"}`}
              style={{ animationDelay: `${(idx + 1) * 100}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-tr ${note.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-2xl pointer-events-none`} />
              
              <div className="flex items-center justify-between mb-6 z-10 relative">
                <span className="px-3 py-1.5 rounded bg-[#05070A] border border-white/5 text-[10px] font-geist-mono font-bold text-[var(--text-muted)] uppercase tracking-wider group-hover:border-[#00E5B0]/30 group-hover:text-[#00E5B0] transition-colors">
                  Experiment {note.id.toString().padStart(3, '0')}
                </span>
                <span className="font-geist-mono text-xs text-[var(--text-muted)] tracking-wider">{note.date}</span>
              </div>
              
              <h3 className="text-xl md:text-2xl font-black font-space-grotesk mb-3 text-white group-hover:text-[#00E5B0] transition-colors flex items-center justify-between z-10 relative">
                {note.title}
                <ChevronRight size={20} className={`transform transition-transform duration-300 text-[var(--text-muted)] ${isExpanded ? "rotate-90 text-[#00E5B0]" : "group-hover:translate-x-1"}`} />
              </h3>
              
              <p className={`text-[14px] text-[var(--text-secondary)] leading-relaxed transition-all duration-300 z-10 relative font-geist-sans ${isExpanded ? "opacity-100 max-h-40" : "opacity-80 max-h-20"}`}>
                {note.description}
              </p>
              
              {isExpanded && (
                <div className="mt-6 pt-5 border-t border-white/5 text-[13px] font-geist-mono text-[#00C2FF] select-none animate-fade-in-down z-10 relative flex items-center gap-2">
                  <span className="font-bold">&gt;</span> Reading logs...<span className="inline-block w-[8px] h-[15px] bg-[#00C2FF] animate-[blink_1s_step-end_infinite]" />
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </section>
  );
}
