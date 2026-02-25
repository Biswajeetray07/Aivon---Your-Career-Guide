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
    <div className="min-h-screen pt-28 pb-20 container mx-auto px-6 md:px-12 font-space-grotesk relative">
      
      {/* Header */}
      <div className="w-full max-w-6xl mb-12 border-b border-[#00C2FF]/20 pb-8 stagger-1 animate-fade-in-up flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
           <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center gap-4">
             Target Matrix
           </h1>
           <p className="text-[#00C2FF]/60 text-xs font-geist-mono mt-2 uppercase tracking-[0.2em] flex items-center gap-2">
             <span className="text-[#00E5B0] animate-pulse">■</span> [ // AVAILABLE_OPERATIVE_MISSIONS ]
           </p>
        </div>
        <div className="flex text-right flex-col items-start md:items-end">
           <span className="text-[10px] text-white/30 font-geist-mono tracking-widest uppercase">Encryption: AES-256</span>
           <span className="text-[10px] text-[#00E5B0] font-geist-mono tracking-widest uppercase animate-pulse">SYS.UPLINK: ACTIVE</span>
        </div>
      </div>

      {/* ── Unified Tactical Stats Array ── */}
      <div className="w-full max-w-6xl mb-8 stagger-2 animate-fade-in-up">
        <div className="bg-[#05070A] border border-white/10 relative flex flex-col md:flex-row items-center justify-between shadow-[0_0_30px_rgba(255,255,255,0.02)] overflow-hidden">
          
          {/* Subtle Scanline Background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none opacity-50" />
          
          {/* Decorative Corner Accents */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/30" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/30" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/30" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/30" />

          {/* Stat 1: Total Targets */}
          <div className="flex-1 w-full md:w-auto p-6 flex flex-col items-center justify-center relative z-10 md:border-r border-white/5 group relative overflow-hidden">
             <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00C2FF] opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_15px_#00C2FF]" />
             <div className="text-4xl md:text-5xl font-vt323 tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] mb-2">
               {total.toLocaleString()}
             </div>
             <div className="text-[10px] font-geist-mono text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-[#00C2FF] animate-pulse shadow-[0_0_8px_#00C2FF]" /> Total Identified
             </div>
          </div>

          {/* Stat 2: Entry Level */}
          <div className="flex-1 w-full md:w-auto p-6 flex flex-col items-center justify-center relative z-10 md:border-r border-white/5 group relative overflow-hidden">
             <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00E5B0] opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_15px_#00E5B0]" />
             <div className="text-4xl md:text-5xl font-vt323 tracking-widest text-[#00E5B0] drop-shadow-[0_0_10px_rgba(0,229,176,0.3)] mb-2">
               ~35%
             </div>
             <div className="text-[10px] font-geist-mono text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-transparent border border-[#00E5B0]" /> Entry Level
             </div>
          </div>

          {/* Stat 3: Extreme Risk */}
          <div className="flex-1 w-full md:w-auto p-6 flex flex-col items-center justify-center relative z-10 group relative overflow-hidden">
             <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF5F56] opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_15px_#FF5F56]" />
             <div className="text-4xl md:text-5xl font-vt323 tracking-widest text-[#FF5F56] drop-shadow-[0_0_10px_rgba(255,95,86,0.3)] mb-2">
               ~30%
             </div>
             <div className="text-[10px] font-geist-mono text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
               <span className="text-[#FF5F56] text-[8px] animate-ping">▲</span> Extreme Risk
             </div>
          </div>
        </div>
      </div>

      {/* ── Fluid Control Bar (Search & Filters) ── */}
      <div className="w-full max-w-6xl mb-8 flex flex-col md:flex-row gap-4 stagger-3 animate-fade-in-up items-center relative z-20">
        
        {/* Search Pill */}
        <div className="flex-1 w-full bg-white/5 border border-white/10 rounded-full px-5 py-3 relative group focus-within:bg-white/10 focus-within:border-[#00C2FF]/30 focus-within:shadow-[0_0_20px_rgba(0,194,255,0.15)] transition-all flex items-center gap-3 backdrop-blur-md overflow-hidden">
          <Terminal className="w-4 h-4 text-[#00C2FF] shrink-0 opacity-50 group-focus-within:opacity-100 group-focus-within:animate-pulse transition-opacity" />
          <input
            id="problem-search"
            aria-label="Search problems"
            placeholder="Search Target Matrix..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none text-[13px] md:text-[14px] font-space-grotesk text-white placeholder-white/30 outline-none tracking-wide"
          />
        </div>

        {/* Filter Trigger Button (Simplified Hacker Style) */}
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`shrink-0 flex items-center gap-3 px-6 py-3 border text-[11px] font-geist-mono font-bold uppercase tracking-[0.1em] transition-all ${
            isFilterOpen || activeFiltersCount > 0
              ? "bg-[#00C2FF]/10 text-[#00C2FF] border-[#00C2FF]/50" 
              : "bg-[#05070A] text-white/50 border-white/10 hover:border-[#00C2FF]/30 hover:text-[#00C2FF]/80"
          }`}
        >
          <Filter className="w-4 h-4" />
          [ FILTERS ]
          {activeFiltersCount > 0 && (
            <span className="flex items-center justify-center w-4 h-4 rounded bg-[#00C2FF] text-[#05070A] text-[10px] ml-1">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Filter Dropdown Panel */}
        {isFilterOpen && (
          <div className="absolute top-full mt-4 right-0 w-full md:w-[450px] bg-[#0A0F14]/95 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden animate-fade-in-up z-50">
            {/* Panel Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-white/5">
              <span className="text-white font-geist-mono text-[11px] uppercase tracking-[0.2em] font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C2FF] animate-pulse" /> Filter Matrix
              </span>
              <div className="flex items-center gap-4">
                 {activeFiltersCount > 0 && (
                   <button onClick={clearFilters} className="text-[9px] font-geist-mono text-white/40 hover:text-[#FF5F56] transition-colors uppercase tracking-[0.1em]">
                     [ CLEAR_ALL ]
                   </button>
                 )}
                 <button onClick={() => setIsFilterOpen(false)} className="text-white/40 hover:text-white p-1">
                   <X className="w-4 h-4" />
                 </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Difficulty Section */}
              <div>
                <span className="block text-white/40 font-geist-mono text-[9px] uppercase tracking-[0.2em] mb-4">Threat Level Rating:</span>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTIES.slice(1).map((d) => { // Skip empty string
                    let activeClass = "";
                    if (d === "EASY") activeClass = "bg-[#00E5B0]/15 text-[#00E5B0] border-[#00E5B0]/50 shadow-[0_0_10px_rgba(0,229,176,0.2)]";
                    if (d === "MEDIUM") activeClass = "bg-[#FACC15]/15 text-[#FACC15] border-[#FACC15]/50 shadow-[0_0_10px_rgba(250,204,21,0.2)]";
                    if (d === "HARD") activeClass = "bg-[#FF5F56]/15 text-[#FF5F56] border-[#FF5F56]/50 shadow-[0_0_10px_rgba(255,95,86,0.2)]";

                    return (
                      <button key={d} onClick={() => { setDifficulty(difficulty === d ? "" : d); setPage(1); }}
                         className={`flex items-center gap-2 px-5 py-2 rounded-lg border text-[10px] font-geist-mono font-bold uppercase tracking-[0.1em] transition-all ${
                           difficulty === d 
                             ? activeClass 
                             : "bg-white/5 text-white/40 border-white/5 hover:text-white hover:bg-white/10"
                         }`}
                      >
                        {difficulty === d && <span className="w-1 h-3 bg-current animate-pulse" />}
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tag Section */}
              <div>
                <span className="block text-white/40 font-geist-mono text-[9px] uppercase tracking-[0.2em] mb-4">Parameter Keywords:</span>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map((t) => (
                    <button key={t} onClick={() => { setTag(tag === t ? "" : t); setPage(1); }}
                      className={`px-3 py-1.5 rounded-md text-[9px] font-space-grotesk tracking-wider uppercase transition-all duration-300 border ${
                         tag === t 
                            ? "bg-[#00C2FF]/15 text-white border-[#00C2FF]/50 shadow-[0_0_10px_rgba(0,194,255,0.2)]" 
                            : "bg-white/5 text-white/30 border-white/5 hover:border-white/10 hover:text-white/60 hover:bg-white/10"
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rows to Show */}
              <div>
                <span className="block text-white/40 font-geist-mono text-[9px] uppercase tracking-[0.2em] mb-4">Data Stream Limit:</span>
                <div className="flex flex-wrap gap-2">
                  {[10, 20, 50].map((l) => (
                    <button key={l} onClick={() => { setLimit(l); setPage(1); }}
                      className={`px-4 py-1.5 border text-[10px] font-geist-mono font-bold tracking-[0.1em] transition-all ${
                        limit === l 
                          ? "bg-[#00C2FF]/10 text-[#00C2FF] border-[#00C2FF]/50" 
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
            <div className="px-6 py-4 border-t border-white/5 bg-black/20 flex justify-end">
               <button onClick={() => setIsFilterOpen(false)} className="px-6 py-2 bg-[#00C2FF]/10 text-[#00C2FF] text-[10px] font-geist-mono font-bold uppercase tracking-[0.1em] rounded-full border border-[#00C2FF]/30 hover:bg-[#00C2FF]/20 hover:shadow-[0_0_15px_rgba(0,194,255,0.2)] transition-all">
                 Apply Logic
               </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Master Terminal Array (Problems List) ── */}
      <div className="w-full max-w-6xl stagger-5 animate-fade-in-up flex flex-col relative">
        <div className="bg-[#05070A] border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)] relative flex flex-col w-full overflow-hidden">
           {/* Master Corner Brackets */}
           <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/50 z-20 pointer-events-none" />
           <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/50 z-20 pointer-events-none" />
           <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/50 z-20 pointer-events-none" />
           <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/50 z-20 pointer-events-none" />
           
           {/* Master Header */}
           <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-[#0A0F14]/90 relative z-10 w-full">
             <span className="text-[10px] sm:text-[12px] font-geist-mono text-white/80 tracking-[0.2em] font-bold flex items-center gap-3">
               <span className="text-white animate-pulse">■</span> [ // AVAILABLE_TARGETS ]
             </span>
             <span className="text-[8px] sm:text-[10px] font-geist-mono text-white/40 tracking-wider hidden sm:block">DATA_STREAM: SECURE</span>
           </div>

           {/* Table Headers (Clean Data Alignment) */}
           <div className="px-5 py-3 border-b border-white/5 bg-[#05070A] flex items-center gap-4 sm:gap-6 text-[8px] sm:text-[10px] font-geist-mono text-white/40 uppercase tracking-[0.2em] font-bold">
              <div className="w-12 sm:w-16 text-center shrink-0">PID</div>
              <div className="flex-1 pl-2">Target Name</div>
              <div className="w-20 md:w-28 text-left shrink-0">Threat Level</div>
              <div className="hidden lg:flex flex-1 text-left">Parameters</div>
              <div className="w-24 sm:w-32 text-right shrink-0">Action</div>
           </div>

           <div className="flex flex-col relative z-10 bg-[#05070A]">
             {/* Background Scanline */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none opacity-50" />

             {loading ? (
                 <div className="p-20 text-center w-full flex flex-col items-center gap-4 relative z-10 bg-[#05070A]/80 backdrop-blur-sm">
                   <span className="text-[#00C2FF] font-geist-mono text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 border border-[#00C2FF]/20 bg-[#00C2FF]/5 px-6 py-4">
                     <Terminal className="w-5 h-5 animate-bounce" /> Interrogating Database <span className="w-3 h-5 bg-[#00C2FF] animate-pulse" />
                   </span>
                 </div>
             ) : problems.length === 0 ? (
                 <div className="p-16 text-center w-full relative z-10 text-[#FF5F56]/70 font-geist-mono text-xs uppercase tracking-[0.2em] border border-[#FF5F56]/20 bg-[#FF5F56]/5 m-4">
                     [ NULL_RESPONSE: NO_TARGETS_FOUND_MATCHING_PARAMETERS ]
                 </div>
             ) : problems.map((problem, i) => {
                 const diffColors: Record<string, string> = { 
                   EASY: "text-[#00E5B0] border-[#00E5B0]/30 shadow-[0_0_10px_rgba(0,229,176,0.1)]", 
                   MEDIUM: "text-[#FACC15] border-[#FACC15]/30 shadow-[0_0_10px_rgba(250,204,21,0.1)]", 
                   HARD: "text-[#FF5F56] border-[#FF5F56]/30 shadow-[0_0_10px_rgba(255,95,86,0.1)]" 
                 };
                 const diffClass = diffColors[problem.difficulty.toUpperCase()] || "text-white border-white/20";
                 const paddedIndex = String((page - 1) * limit + i + 1).padStart(4, '0');
                 
                 return (
                  <div key={problem.id} className="relative group transition-colors duration-300 hover:bg-[#00C2FF]/[0.02] border-b border-white/5 odd:bg-white/[0.01]">
                     
                     {/* Dynamic Hover Scanline */}
                     <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#00C2FF] scale-y-0 group-hover:scale-y-100 transition-transform origin-top z-20 shadow-[0_0_15px_#00C2FF]" />
                     
                     <div className="flex items-center gap-4 sm:gap-6 px-5 py-5 w-full">
                       
                       {/* 1. PID (Hex Padded Index) */}
                       <div className="w-12 sm:w-16 text-center shrink-0">
                         <span className="text-[10px] md:text-[11px] font-geist-mono text-white/30 tracking-[0.2em]">0X{paddedIndex}</span>
                       </div>

                       {/* 2. Title & Status */}
                       <div className="flex-1 pl-2 truncate relative z-10 flex flex-col justify-center">
                          <Link href={`/problems/${problem.slug}`} className="font-vt323 text-[20px] md:text-[24px] uppercase tracking-wide text-white/80 group-hover:text-[#00C2FF] transition-colors truncate block drop-shadow-[0_0_5px_rgba(255,255,255,0.2)] group-hover:drop-shadow-[0_0_10px_rgba(0,194,255,0.5)]">
                            {problem.title.replace(/-/g, " ")}
                          </Link>
                          <div className="flex items-center gap-3 mt-1">
                             <span className="text-[8px] font-geist-mono text-white/40 tracking-[0.2em] uppercase">Status: </span>
                             <span className="text-[8px] font-geist-mono text-[#00E5B0] bg-[#00E5B0]/10 px-1.5 py-0.5 border border-[#00E5B0]/20 tracking-widest uppercase">
                               [ ONLINE ]
                             </span>
                          </div>
                       </div>

                       {/* 3. Threat Level */}
                       <div className="w-20 md:w-28 text-left shrink-0 relative z-10 flex flex-col">
                          <span className="text-[8px] font-geist-mono text-white/30 tracking-[0.2em] uppercase mb-1 hidden md:block">Class:</span>
                          <span className={`text-[10px] font-bold font-geist-mono tracking-[0.2em] uppercase px-2 py-1 border bg-black/40 inline-flex items-center gap-2 ${diffClass}`}>
                             <span className="w-1 h-1 rounded-full bg-current animate-pulse shadow-[0_0_5px_currentColor]" />
                             {problem.difficulty}
                          </span>
                       </div>

                       {/* 4. Tags (Parameters) */}
                       <div className="hidden lg:flex flex-1 gap-2 flex-wrap relative z-10">
                          {(problem.tags || []).slice(0, 3).map((t) => (
                            <span key={t} className="text-[9px] font-geist-mono text-[#00C2FF]/60 bg-[#00C2FF]/5 px-2 py-1 uppercase tracking-widest whitespace-nowrap border border-[#00C2FF]/20">
                              {t}
                            </span>
                          ))}
                       </div>

                       {/* 5. Action */}
                       <div className="w-24 sm:w-32 text-right shrink-0 relative z-10">
                          <Link href={`/problems/${problem.slug}`}>
                            <button className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#05070A] text-[#00C2FF]/70 text-[10px] md:text-[11px] font-geist-mono font-bold tracking-[0.2em] uppercase border border-[#00C2FF]/30 hover:bg-[#00C2FF]/10 hover:text-[#00C2FF] hover:border-[#00C2FF] transition-all group/btn shadow-[0_0_10px_rgba(0,194,255,0.1)] hover:shadow-[0_0_15px_rgba(0,194,255,0.3)]">
                               <span className="text-[12px] group-hover/btn:translate-x-1 transition-transform">{'>'}</span> EXECUTE
                            </button>
                          </Link>
                       </div>

                     </div>
                  </div>
                 );
               })}
           </div>
        </div>

        {/* ── Terminal Pagination ── */}
        <div className="flex justify-between items-center w-full mt-6 border border-white/10 bg-[#05070A] p-2 relative shadow-[0_0_30px_rgba(255,255,255,0.02)]">
          <button 
            onClick={() => setPage(Math.max(1, page - 1))} 
            disabled={page === 1} 
            className="px-4 md:px-8 py-3 text-[10px] md:text-[11px] font-geist-mono font-bold uppercase tracking-[0.2em] text-[#00C2FF]/70 hover:text-[#00C2FF] hover:bg-[#00C2FF]/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-[#00C2FF]/30 flex items-center gap-2"
          >
            <span className="text-[14px]">{'<'}</span> SYS.PREV
          </button>
          
          <div className="flex flex-col items-center px-6 border-x border-white/5">
             <span className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-geist-mono mb-1">Sector Link</span>
             <span className="text-xl md:text-2xl font-vt323 tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
               {String(page).padStart(2, '0')} <span className="text-[#00C2FF] opacity-50">/</span> {String(Math.max(1, Math.ceil(total / limit))).padStart(2, '0')}
             </span>
          </div>

          <button 
            onClick={() => setPage(page + 1)} 
            disabled={page * limit >= total} 
            className="px-4 md:px-8 py-3 text-[10px] md:text-[11px] font-geist-mono font-bold uppercase tracking-[0.2em] text-[#00E5B0]/70 hover:text-[#00E5B0] hover:bg-[#00E5B0]/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-[#00E5B0]/30 flex items-center gap-2"
          >
            SYS.NEXT <span className="text-[14px]">{'>'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
