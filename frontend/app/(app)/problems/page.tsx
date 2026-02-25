"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listProblems, type Problem } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusDot } from "@/components/ui/badge";
import { Terminal, Filter, X } from "lucide-react";

const DIFFICULTIES = ["", "EASY", "MEDIUM", "HARD"];
const TAGS = ["Array", "String", "Tree", "Graph", "DP", "Hash Table", "Binary Search", "Stack", "Sorting"];

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [difficulty, setDifficulty] = useState("");
  const [tag, setTag] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Active filter count
  const activeFiltersCount = (difficulty ? 1 : 0) + (tag ? 1 : 0);

  const clearFilters = () => {
    setDifficulty("");
    setTag("");
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
    setIsFilterOpen(false);
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(true), 0);
    listProblems({ 
      difficulty: difficulty || undefined, 
      tags: tag || undefined, 
      search: debouncedSearch || undefined,
      page, 
      limit 
    })
      .then((data) => { setProblems(data.problems); setTotal(data.total); })
      .catch(e => console.warn("Problem fetch failed:", e.message))
      .finally(() => setLoading(false));
    return () => clearTimeout(timer);
  }, [difficulty, tag, debouncedSearch, page, limit]);

  return (
    <div className="min-h-screen pt-28 pb-20 container mx-auto px-6 md:px-12 font-space-grotesk relative xl:max-w-[1500px]">
      
      {/* Interactive Cyber Background */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(0,229,176,0.1),transparent_60%),radial-gradient(circle_at_120%_50%,rgba(0,194,255,0.05),transparent_50%)] pointer-events-none z-0" />
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

      
      {/* Header */}
      <div className="w-full mb-12 border-b border-white/10 pb-8 stagger-1 animate-fade-in-up flex flex-col md:flex-row items-start lg:items-center justify-between gap-6 relative z-10 bg-[#0A0F14]/40 p-8 rounded-2xl shadow-[0_0_30px_rgba(0,229,176,0.02)]">
        <div>
           <div className="flex items-center gap-3 text-[10px] sm:text-[11px] text-[var(--text-muted)] font-geist-mono font-bold tracking-[0.2em] uppercase mb-4 text-[#00E5B0]">
              <div className="w-2 h-2 rounded-sm bg-[#00E5B0] animate-pulse shadow-[0_0_8px_#00E5B0]" />
              SYS_AUTH: OPERATIVE VERIFIED
           </div>
           <h1 className="text-5xl md:text-[64px] lg:text-[76px] font-vt323 tracking-widest uppercase m-0 leading-[0.9] text-transparent bg-clip-text bg-[linear-gradient(180deg,#FFFFFF_0%,#A1A1AA_100%)] relative flex flex-col items-start gap-1">
             <span>TARGET</span>
             <span className="text-[#00C2FF] text-[0.8em] tracking-[0.15em] bg-clip-text text-transparent bg-[linear-gradient(90deg,#00C2FF_0%,#00E5B0_100%)] border-b-2 border-[#00C2FF]/30 pb-1">
               MATRIX
               <span className="inline-block w-[0.4em] h-[0.8em] bg-[#00C2FF] ml-2 animate-pulse align-middle" />
             </span>
           </h1>
           <p className="text-[#00C2FF]/60 text-xs font-geist-mono mt-6 uppercase tracking-[0.2em] flex items-center gap-2">
             <span className="text-[#00E5B0] animate-[ping_2s_infinite]">■</span> [ // AVAILABLE_OPERATIVE_MISSIONS ]
           </p>
        </div>
        <div className="flex text-right flex-col items-start lg:items-end glass border border-white/5 p-6 rounded-xl bg-[#05070A]/80 shadow-[0_0_30px_rgba(0,194,255,0.05)] backdrop-blur-md">
           <span className="text-[10px] text-white/40 font-geist-mono tracking-widest uppercase mb-3">Encryption: AES-256</span>
           <span className="text-[12px] text-[#00E5B0] font-geist-mono tracking-widest uppercase animate-pulse flex items-center gap-3 bg-[#00E5B0]/10 px-3 py-1.5 rounded-full border border-[#00E5B0]/20">
             <span className="w-2 h-2 rounded-full bg-[#00E5B0] shadow-[0_0_8px_#00E5B0]" /> SYS.UPLINK: ACTIVE
           </span>
        </div>
      </div>

      {/* ── Unified Tactical Stats Array ── */}
      <div className="w-full mb-12 stagger-2 animate-fade-in-up relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Stat 1: Total Targets */}
        <div className="bg-[#05070A]/80 border border-white/10 rounded-2xl p-6 relative group overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.02)] hover:border-white/20 transition-all backdrop-blur-md flex flex-col items-center justify-center">
           {/* Structural Frame & Corners */}
           <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white/30 group-hover:border-white/60 transition-colors" />
           <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white/30 group-hover:border-white/60 transition-colors" />
           <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white/30 group-hover:border-white/60 transition-colors" />
           <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white/30 group-hover:border-white/60 transition-colors" />

           <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#00C2FF]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
           
           <div className="text-[9px] text-[#00C2FF]/60 uppercase tracking-[0.2em] font-geist-mono font-bold mb-3 flex items-center gap-2 relative z-10">
             <span className="w-1.5 h-1.5 rounded-full bg-[#00C2FF] animate-pulse shadow-[0_0_8px_#00C2FF]" />
             Total Identified
           </div>
           <div className="text-5xl md:text-6xl font-vt323 tracking-widest text-[#00C2FF] drop-shadow-[0_0_10px_rgba(0,194,255,0.3)] group-hover:drop-shadow-[0_0_20px_rgba(0,194,255,0.6)] transition-all relative z-10">
             {total.toLocaleString()}
           </div>
        </div>

        {/* Stat 2: Entry Level */}
        <div className="bg-[#05070A]/80 border border-white/10 rounded-2xl p-6 relative group overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.02)] hover:border-white/20 transition-all backdrop-blur-md flex flex-col items-center justify-center">
           <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white/30 group-hover:border-white/60 transition-colors" />
           <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white/30 group-hover:border-white/60 transition-colors" />
           <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white/30 group-hover:border-white/60 transition-colors" />
           <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white/30 group-hover:border-white/60 transition-colors" />

           <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#00E5B0]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
           
           <div className="text-[9px] text-[#00E5B0]/60 uppercase tracking-[0.2em] font-geist-mono font-bold mb-3 flex items-center gap-2 relative z-10">
             <span className="w-1.5 h-1.5 rounded-full bg-transparent border border-[#00E5B0]" />
             Entry Level
           </div>
           <div className="text-5xl md:text-6xl font-vt323 tracking-widest text-[#00E5B0] drop-shadow-[0_0_10px_rgba(0,229,176,0.3)] group-hover:drop-shadow-[0_0_20px_rgba(0,229,176,0.6)] transition-all relative z-10">
             ~35%
           </div>
        </div>

        {/* Stat 3: Extreme Risk */}
        <div className="bg-[#05070A]/80 border border-white/10 rounded-2xl p-6 relative group overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.02)] hover:border-white/20 transition-all backdrop-blur-md flex flex-col items-center justify-center">
           <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white/30 group-hover:border-white/60 transition-colors" />
           <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white/30 group-hover:border-white/60 transition-colors" />
           <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white/30 group-hover:border-white/60 transition-colors" />
           <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white/30 group-hover:border-white/60 transition-colors" />

           <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#FF5F56]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
           
           <div className="text-[9px] text-[#FF5F56]/80 uppercase tracking-[0.2em] font-geist-mono font-bold mb-3 flex items-center gap-2 relative z-10">
             <span className="text-[#FF5F56] text-[8px] animate-ping">▲</span>
             Extreme Risk
           </div>
           <div className="text-5xl md:text-6xl font-vt323 tracking-widest text-[#FF5F56] drop-shadow-[0_0_10px_rgba(255,95,86,0.3)] group-hover:drop-shadow-[0_0_20px_rgba(255,95,86,0.6)] transition-all relative z-10">
             ~30%
           </div>
        </div>
      </div>

      {/* ── Fluid Control Bar (Search & Filters) ── */}
      <div className="w-full mb-8 flex flex-col md:flex-row gap-4 stagger-3 animate-fade-in-up items-center relative z-20 bg-[#0A0F14]/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(0,194,255,0.02)]">
        
        {/* Search Pill */}
        <div className="flex-1 w-full bg-[#05070A]/50 border border-white/10 rounded-xl px-5 py-3.5 relative group focus-within:bg-[#05070A]/80 focus-within:border-[#00C2FF]/40 focus-within:shadow-[0_0_20px_rgba(0,194,255,0.15)] transition-all flex items-center gap-4 overflow-hidden">
          <Terminal className="w-4 h-4 text-[#00C2FF] shrink-0 opacity-50 group-focus-within:opacity-100 group-focus-within:animate-pulse transition-opacity" />
          <input
            id="problem-search"
            aria-label="Search problems"
            placeholder="Search Target Matrix..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none text-[14px] font-space-grotesk text-white placeholder-white/30 outline-none tracking-wide"
          />
          {/* Subtle gradient sweep inside input on focus */}
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#00C2FF]/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
        </div>

        {/* Filter Trigger Button (Premium Glass Style) */}
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`shrink-0 flex items-center gap-3 px-6 py-3.5 rounded-xl border text-[11px] font-geist-mono font-bold uppercase tracking-[0.1em] transition-all backdrop-blur-md ${
            isFilterOpen || activeFiltersCount > 0
              ? "bg-[#00C2FF]/10 text-[#00C2FF] border-[#00C2FF]/50 shadow-[0_0_15px_rgba(0,194,255,0.2)]" 
              : "bg-[#05070A]/80 text-white/50 border-white/10 hover:border-white/20 hover:text-white"
          }`}
        >
          <Filter className="w-4 h-4" />
          [ SYSTEM FILTERS ]
          {activeFiltersCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-[#00C2FF] text-[#05070A] text-[10px] ml-1 shadow-[0_0_8px_#00C2FF]">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Filter Dropdown Panel */}
        {isFilterOpen && (
          <div className="absolute top-full mt-4 right-0 w-full md:w-[450px] bg-[#0A0F14]/90 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden animate-fade-in-up z-50">
            {/* Panel Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-white/5 bg-white-[0.02]">
              <span className="text-white font-geist-mono text-[11px] uppercase tracking-[0.2em] font-bold flex items-center gap-3">
                <span className="w-2 h-2 rounded-sm bg-[#00C2FF] animate-pulse shadow-[0_0_8px_#00C2FF]" /> Filter Matrix
              </span>
              <div className="flex items-center gap-4">
                 {activeFiltersCount > 0 && (
                   <button onClick={clearFilters} className="text-[10px] font-geist-mono text-white/50 hover:text-[#FF5F56] transition-colors uppercase tracking-[0.1em]">
                     [ CLEAR_ALL ]
                   </button>
                 )}
                 <button onClick={() => setIsFilterOpen(false)} className="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                   <X className="w-4 h-4" />
                 </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Difficulty Section */}
              <div>
                <span className="block text-white/50 font-geist-mono text-[10px] uppercase tracking-[0.2em] mb-4">Threat Level Rating:</span>
                <div className="flex flex-wrap gap-3">
                  {DIFFICULTIES.slice(1).map((d) => { // Skip empty string
                    let activeClass = "";
                    if (d === "EASY") activeClass = "bg-[#00E5B0]/15 text-[#00E5B0] border-[#00E5B0]/50 shadow-[0_0_15px_rgba(0,229,176,0.2)]";
                    if (d === "MEDIUM") activeClass = "bg-[#FACC15]/15 text-[#FACC15] border-[#FACC15]/50 shadow-[0_0_15px_rgba(250,204,21,0.2)]";
                    if (d === "HARD") activeClass = "bg-[#FF5F56]/15 text-[#FF5F56] border-[#FF5F56]/50 shadow-[0_0_15px_rgba(255,95,86,0.2)]";

                    return (
                      <button key={d} onClick={() => { setDifficulty(difficulty === d ? "" : d); setPage(1); }}
                         className={`flex items-center gap-2 px-6 py-2.5 rounded-xl border text-[11px] font-geist-mono font-bold uppercase tracking-[0.1em] transition-all backdrop-blur-sm ${
                           difficulty === d 
                             ? activeClass 
                             : "bg-[#05070A]/50 text-white/40 border-white/10 hover:text-white hover:border-white/30 hover:bg-[#05070A]"
                         }`}
                      >
                        {difficulty === d && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shadow-[0_0_5px_currentColor]" />}
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tag Section */}
              <div>
                <span className="block text-white/50 font-geist-mono text-[10px] uppercase tracking-[0.2em] mb-4">Parameter Keywords:</span>
                <div className="flex flex-wrap gap-2.5">
                  {TAGS.map((t) => (
                    <button key={t} onClick={() => { setTag(tag === t ? "" : t); setPage(1); }}
                      className={`px-4 py-2 rounded-lg text-[10px] font-space-grotesk tracking-widest uppercase transition-all duration-300 border backdrop-blur-sm ${
                         tag === t 
                            ? "bg-[#00C2FF]/15 text-[#00C2FF] border-[#00C2FF]/50 shadow-[0_0_15px_rgba(0,194,255,0.2)]" 
                            : "bg-[#05070A]/50 text-white/40 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5"
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rows to Show */}
              <div>
                <span className="block text-white/50 font-geist-mono text-[10px] uppercase tracking-[0.2em] mb-4">Data Stream Limit:</span>
                <div className="flex flex-wrap gap-3">
                  {[10, 20, 50].map((l) => (
                    <button key={l} onClick={() => { setLimit(l); setPage(1); }}
                      className={`px-5 py-2 border rounded-lg text-[11px] font-geist-mono font-bold tracking-[0.1em] transition-all backdrop-blur-sm ${
                        limit === l 
                          ? "bg-[#00C2FF]/10 text-[#00C2FF] border-[#00C2FF]/50 shadow-[0_0_15px_rgba(0,194,255,0.2)]" 
                          : "bg-transparent text-white/40 border-white/10 hover:border-white/30 hover:text-white"
                      }`}
                    >
                      {l} ROWS
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Panel Footer */}
            <div className="px-6 py-5 border-t border-white/5 bg-[#05070A]/80 flex justify-end">
               <button onClick={() => setIsFilterOpen(false)} className="px-8 py-2.5 bg-[#00C2FF]/10 text-[#00C2FF] text-[11px] font-geist-mono font-bold uppercase tracking-[0.1em] rounded-xl border border-[#00C2FF]/30 hover:bg-[#00C2FF]/20 hover:border-[#00C2FF]/60 hover:shadow-[0_0_20px_rgba(0,194,255,0.3)] transition-all">
                 Apply Logic
               </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Glassmorphic Data Grid (Problems List) ── */}
      <div className="w-full stagger-5 animate-fade-in-up flex flex-col relative">
         <div className="flex justify-between items-center mb-6 px-2">
           <span className="text-[12px] sm:text-[14px] font-geist-mono text-white/80 tracking-[0.2em] font-bold flex items-center gap-3">
             <span className="text-[#00C2FF] animate-pulse shadow-[0_0_8px_#00C2FF] w-2 h-2 rounded-full block" /> AVAILABLE_TARGETS
           </span>
           <span className="text-[10px] font-geist-mono text-[#00E5B0] tracking-[0.1em] hidden sm:flex items-center gap-2 border border-[#00E5B0]/20 bg-[#00E5B0]/10 px-3 py-1 rounded-full">
             <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
             DATA_STREAM: CONNECTED
           </span>
         </div>

         {/* Soft Column Headers */}
         <div className="px-8 py-4 mb-4 flex items-center gap-4 sm:gap-6 text-[10px] font-geist-mono text-white/30 uppercase tracking-[0.2em] font-bold">
            <div className="w-14 sm:w-20 text-center shrink-0">PID / ID</div>
            <div className="flex-1 pl-2 text-left">Target Profile</div>
            <div className="w-24 md:w-32 text-left shrink-0">Threat Level</div>
            <div className="hidden lg:flex flex-1 text-left">Data Parameters</div>
            <div className="w-28 sm:w-36 text-right shrink-0">Terminal Action</div>
         </div>

         {/* Floating Card List */}
         <div className="flex flex-col gap-3 relative z-10 w-full">
            {loading ? (
                 <div className="p-24 text-center w-full flex flex-col items-center gap-6 relative z-10 bg-[#0A0F14]/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_0_40px_rgba(0,194,255,0.05)]">
                   <div className="relative">
                     <div className="w-16 h-16 border-4 border-[#00C2FF]/20 border-t-[#00C2FF] rounded-full animate-spin" />
                     <Terminal className="w-6 h-6 text-[#00C2FF] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                   </div>
                   <span className="text-[#00C2FF] font-geist-mono text-sm uppercase tracking-[0.2em] font-bold drop-shadow-[0_0_8px_#00C2FF]">
                     Executing Data Sweep...
                   </span>
                 </div>
            ) : problems.length === 0 ? (
                 <div className="p-20 text-center w-full relative z-10 bg-[#0A0F14]/60 backdrop-blur-xl border border-[#FF5F56]/20 rounded-3xl shadow-[0_0_40px_rgba(255,95,86,0.05)] flex flex-col items-center gap-4">
                     <span className="text-[#FF5F56] font-geist-mono text-xs uppercase tracking-[0.2em] font-bold">
                       [ NULL_RESPONSE: NO_TARGETS_FOUND ]
                     </span>
                     <span className="text-white/40 font-geist-mono text-[10px] tracking-widest break-words max-w-sm">
                       Adjust search parameters or system filters to re-establish connection to operative targets.
                     </span>
                 </div>
            ) : problems.map((problem, i) => {
                 const diffColors: Record<string, string> = { 
                   EASY: "text-[#00E5B0] border-[#00E5B0]/30 bg-[#00E5B0]/[0.05] shadow-[0_0_15px_rgba(0,229,176,0.1)]", 
                   MEDIUM: "text-[#FACC15] border-[#FACC15]/30 bg-[#FACC15]/[0.05] shadow-[0_0_15px_rgba(250,204,21,0.1)]", 
                   HARD: "text-[#FF5F56] border-[#FF5F56]/30 bg-[#FF5F56]/[0.05] shadow-[0_0_15px_rgba(255,95,86,0.1)]" 
                 };
                 const diffClass = diffColors[problem.difficulty.toUpperCase()] || "text-white border-white/20 bg-white/5";
                 const paddedIndex = String((page - 1) * limit + i + 1).padStart(4, '0');
                 
                 return (
                  <div key={problem.id} className="relative group bg-[#05070A]/60 backdrop-blur-md border border-white/5 hover:border-white/20 hover:bg-[#0A0F14]/80 rounded-2xl transition-all duration-500 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_40px_rgba(0,194,255,0.1)] flex items-center justify-between p-1 hover:-translate-y-0.5">
                     
                     {/* Dynamic Hover Gradient Sweep */}
                     <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#00C2FF] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                     <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-[#00C2FF] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                     
                     <div className="flex items-center gap-4 sm:gap-6 px-6 py-5 w-full bg-gradient-to-br from-white/[0.01] to-transparent rounded-xl">
                       
                       {/* 1. PID (Hex Padded Index) */}
                       <div className="w-14 sm:w-20 text-center shrink-0">
                         <span className="text-[11px] md:text-[13px] font-geist-mono text-white/40 tracking-[0.2em] font-bold group-hover:text-white/70 transition-colors">0x{paddedIndex}</span>
                       </div>

                       {/* 2. Title & Status */}
                       <div className="flex-1 pl-2 truncate relative z-10 flex flex-col justify-center">
                          <Link href={`/problems/${problem.slug}`} className="font-space-grotesk font-black text-[18px] md:text-[22px] tracking-wide text-white/80 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-[#00C2FF] transition-all truncate block drop-shadow-[0_0_5px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_15px_rgba(0,194,255,0.3)] capitalize">
                            {problem.title.replace(/-/g, " ")}
                          </Link>
                          <div className="flex items-center gap-3 mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                             <span className="text-[9px] font-geist-mono text-white/40 tracking-[0.2em] uppercase">Sys.Link: </span>
                             <span className="text-[9px] font-geist-mono text-[#00E5B0] bg-[#00E5B0]/10 px-2 py-0.5 rounded-sm border border-[#00E5B0]/20 tracking-widest uppercase flex items-center gap-1.5">
                               <span className="w-1 h-1 rounded-full bg-[#00E5B0] shadow-[0_0_5px_#00E5B0]" /> ONLINE
                             </span>
                          </div>
                       </div>

                       {/* 3. Threat Level */}
                       <div className="w-24 md:w-32 text-left shrink-0 relative z-10 flex flex-col justify-center">
                          <span className={`text-[11px] font-bold font-geist-mono tracking-[0.15em] uppercase px-3 py-1.5 rounded-lg border flex items-center gap-2 ${diffClass}`}>
                             <span className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
                             {problem.difficulty}
                          </span>
                       </div>

                       {/* 4. Tags (Parameters) */}
                       <div className="hidden lg:flex flex-1 gap-2 flex-wrap relative z-10">
                          {(problem.tags || []).slice(0, 3).map((t) => (
                            <span key={t} className="text-[10px] font-geist-mono text-[#00C2FF]/70 bg-[#00C2FF]/10 px-3 py-1.5 rounded-md uppercase tracking-widest whitespace-nowrap border border-[#00C2FF]/20 group-hover:border-[#00C2FF]/40 transition-colors shadow-[0_0_10px_rgba(0,194,255,0.05)]">
                              {t}
                            </span>
                          ))}
                       </div>

                       {/* 5. Action */}
                       <div className="w-28 sm:w-36 text-right shrink-0 relative z-10">
                          <Link href={`/problems/${problem.slug}`}>
                            <button className="flex items-center justify-center gap-2 w-full py-3 bg-[#0A0F14]/80 text-[#00C2FF]/80 text-[11px] md:text-[12px] font-geist-mono font-bold tracking-[0.2em] uppercase rounded-xl border border-[#00C2FF]/30 hover:bg-[#00C2FF]/15 hover:text-[#00C2FF] hover:border-[#00C2FF]/60 transition-all group/btn shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(0,194,255,0.2)]">
                               <span className="text-[14px] font-black group-hover/btn:translate-x-1 transition-transform group-hover/btn:text-white drop-shadow-md">{'>'}</span> ACCESS
                            </button>
                          </Link>
                       </div>

                     </div>
                  </div>
                 );
               })}
         </div>

        {/* ── Dashboard Style Pagination ── */}
        <div className="flex justify-between items-center w-full mt-10 p-4 relative bg-[#0A0F14]/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(0,194,255,0.02)]">
          <button 
            onClick={() => setPage(Math.max(1, page - 1))} 
            disabled={page === 1} 
            className="px-6 md:px-10 py-3.5 text-[11px] md:text-[12px] font-geist-mono font-bold uppercase tracking-[0.2em] text-[#00C2FF]/80 hover:text-[#00C2FF] bg-[#00C2FF]/5 hover:bg-[#00C2FF]/15 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-[#00C2FF]/20 hover:border-[#00C2FF]/50 rounded-xl flex items-center gap-3 shadow-[0_0_15px_rgba(0,194,255,0.05)] hover:shadow-[0_0_20px_rgba(0,194,255,0.2)]"
          >
            <span className="text-[16px]">{'<'}</span> PREV_BLOCK
          </button>
          
          <div className="flex flex-col items-center px-8 border-x border-white/5">
             <span className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-geist-mono mb-1 text-center">Data Sector</span>
             <span className="text-2xl md:text-3xl font-space-grotesk font-black tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
               {String(page).padStart(2, '0')} <span className="text-[#00C2FF] opacity-40 mx-2 font-light">/</span> {String(Math.max(1, Math.ceil(total / limit))).padStart(2, '0')}
             </span>
          </div>

          <button 
            onClick={() => setPage(page + 1)} 
            disabled={page * limit >= total} 
            className="px-6 md:px-10 py-3.5 text-[11px] md:text-[12px] font-geist-mono font-bold uppercase tracking-[0.2em] text-[#00E5B0]/80 hover:text-[#00E5B0] bg-[#00E5B0]/5 hover:bg-[#00E5B0]/15 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-[#00E5B0]/20 hover:border-[#00E5B0]/50 rounded-xl flex items-center gap-3 shadow-[0_0_15px_rgba(0,229,176,0.05)] hover:shadow-[0_0_20px_rgba(0,229,176,0.2)]"
          >
            NEXT_BLOCK <span className="text-[16px]">{'>'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
