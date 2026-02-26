"use client";
import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { PROJECTS } from "@/lib/data";
import { Star, GitFork } from "lucide-react";
import { StatusDot } from "@/components/ui/badge";

export function ProjectsGrid() {
  const [filter, setFilter] = useState("all");
  
  const filteredProjects = PROJECTS.filter(p => filter === "all" || p.status === filter);

  return (
    <section className="relative py-20 lg:py-32 container mx-auto px-6 md:px-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 stagger-1 animate-fade-in-up">
        <div>
          <h2 className="text-3xl md:text-4xl font-space-grotesk font-black tracking-tight text-white">Open Source Modules</h2>
          <p className="text-[var(--text-secondary)] mt-2 font-geist-mono text-[13px] uppercase tracking-widest">Active System Components</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {["all", "shipped", "in-progress", "archived"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-geist-mono font-bold transition-all duration-300 uppercase ${filter === f ? "bg-[#00E5B0]/20 text-[#00E5B0] border border-[#00E5B0]/50 shadow-[0_0_15px_rgba(0,229,176,0.2)]" : "bg-[#0A0F14] text-[var(--text-secondary)] border border-white/10 hover:border-[#00E5B0]/30 hover:text-white"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project, idx) => (
          <GlassCard
            key={project.title}
            hoverLift
            className={`p-6 md:p-8 flex flex-col h-full group bg-[#060D10]/80 rounded-none border-none ${project.highlight ? "md:col-span-2 lg:col-span-2 shadow-[0_0_30px_rgba(0,229,176,0.1)]" : ""} animate-fade-in-up transition-colors overflow-hidden`}
            style={{ animationDelay: `${(idx % 4 + 1) * 100}ms` }}
          >
            {project.highlight && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E5B0]/10 blur-3xl pointer-events-none" />
            )}
            
            <div className="flex items-center justify-between mb-4">
              <span className="font-geist-mono text-xs text-[var(--text-muted)] tracking-wider">{project.year}</span>
              <div className="flex items-center gap-2">
                {project.highlight && <span className="text-[10px] font-bold tracking-[0.1em] text-[#00E5B0] border border-[#00E5B0]/30 bg-[#00E5B0]/10 px-2 py-0.5 rounded-lg">FEATURED</span>}
                <StatusDot animate={project.status === "in-progress"} colorClass={project.status === "shipped" ? "bg-[#00E5B0]" : project.status === "in-progress" ? "bg-[#FACC15]" : "bg-[#FB923C]"} />
              </div>
            </div>

            <h3 className="text-xl md:text-2xl font-black font-space-grotesk mb-3 text-white group-hover:text-[#00E5B0] drop-shadow-[0_0_5px_rgba(0,229,176,0.2)] transition-colors tracking-tight">
              {project.title}
            </h3>
            
            <p className="text-[14px] text-[var(--text-secondary)] mb-8 flex-grow leading-relaxed font-geist-sans">
              {project.description}
            </p>

            <div className="flex items-center justify-between mt-auto pt-5 border-t border-white/5 relative z-10">
              <div className="flex flex-wrap gap-2">
                {project.tags.map(tag => (
                  <span key={tag} className="text-[10px] font-geist-mono font-bold px-2.5 py-1 rounded bg-[#05070A] border border-[#00E5B0]/20 text-[#00E5B0] tracking-wider uppercase">
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] font-geist-mono shrink-0">
                <div className="flex items-center gap-1.5 hover:text-[#00E5B0] transition-colors"><Star size={14} /> {project.stats.stars}</div>
                <div className="flex items-center gap-1.5 hover:text-[#00C2FF] transition-colors"><GitFork size={14} /> {project.stats.forks}</div>
              </div>
            </div>

            {/* Scanning Laser Line */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-[#00E5B0] shadow-[0_0_8px_#00E5B0] scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left" />
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#00E5B0] to-[#00C2FF] opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out z-0" />
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
