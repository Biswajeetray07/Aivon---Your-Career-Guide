"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listProblems, type Problem, getMyStats } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";
import { Lock, FileText, ChevronRight, Activity, Zap, CheckCircle2, Copy, PlaySquare, Terminal, Search, Filter, ShieldAlert, Cpu, Network, X } from "lucide-react";
import { useLiveSocket } from "@/hooks/useLiveSocket";
import { useSession } from "next-auth/react";

const DIFFICULTIES = ["", "EASY", "MEDIUM", "HARD"];
const TAGS = ["Array", "String", "Tree", "Graph", "DP", "Hash Table", "Binary Search", "Stack", "Sorting"];

export default function ProblemsPage() {
  const [mounted, setMounted] = useState(false);
  const [hexTime, setHexTime] = useState("");
  const [randHex, setRandHex] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      setHexTime(Date.now().toString(16).toUpperCase());
      setRandHex(Math.floor(Math.random() * 9).toString());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

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
  const { data: session } = useSession();
  const [recentSolves, setRecentSolves] = useState(0);
  const [userSolved, setUserSolved] = useState(0);
  const [userRating, setUserRating] = useState((session?.user as any)?.rating || 1200);

  // Real-time: listen for global solve events
  const { listen } = useLiveSocket(["marketing_stats"]);

  useEffect(() => {
    const unlisten = listen("system_activity", (payload: any) => {
      if (payload?.type === "submission_solved") {
        setRecentSolves(prev => prev + 1);
      }
    });
    
    const unlistenRating = listen("user_stats_update", (payload: any) => {
        if (payload.userId === (session?.user as any)?.id) {
            setUserRating(payload.rating);
        }
    });
    
    return () => {
        unlisten();
        unlistenRating();
    };
  }, [listen, session]);

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

    getMyStats()
      .then(res => {
          setUserSolved(res.totalSolved || 0);
          setUserRating(res.rating || (session?.user as any)?.rating || 1200);
      })
      .catch(() => setUserSolved(0));

    return () => clearTimeout(timer);
  }, [difficulty, tag, debouncedSearch, page, limit]);

  return (
    <div className="min-h-screen pt-[120px] pb-20 w-full max-w-[1500px] mx-auto px-6 md:px-12 font-space-grotesk relative bg-transparent">

      
      {/* ── Unified Tactical HUD (Header + Stats) ── */}
      <div className="w-full mb-12 stagger-1 animate-fade-in-up flex flex-col xl:flex-row gap-8 items-stretch relative z-10">
        
        {/* Global Nexus Operative Dossier Header */}
          <div className="flex-1 glass border border-[#00E5B0]/30 bg-[#060D10]/80 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,229,176,0.1)] relative flex flex-col backdrop-blur-2xl">
          
          {/* Top Tech Bar — Aivon Terminal Style */}
          <div className="px-5 py-4 border-b border-[#00E5B0]/20 flex items-center justify-between bg-[#05070A]/90 relative z-10 w-full">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#00E5B0] animate-pulse" />
              <div className="w-2 h-2 bg-[#00C2FF]" />
            </div>
            <span className="text-[10px] font-geist-mono text-[#00E5B0] tracking-[0.2em] font-bold">
              terminal://aivon/targets
            </span>
          </div>
          
          <div className="p-8 md:p-10 relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 h-full flex-grow">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(0,194,255,0.05)_90deg,transparent_90deg)] animate-[spin_10s_linear_infinite] pointer-events-none mix-blend-screen opacity-50 block" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,194,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,194,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

            {/* Faceted Crosshair Avatar Block (Adapted for Matrix) */}
            <div className="relative group shrink-0 hidden sm:block">
              {/* Targetting crosshairs */}
              <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-[#00E5B0] transition-all duration-300 group-hover:w-full group-hover:h-full group-hover:-top-1 group-hover:-left-1 group-hover:border-[#00C2FF] group-hover:opacity-50 z-20 pointer-events-none" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-[#00E5B0] transition-all duration-300 group-hover:w-full group-hover:h-full group-hover:-bottom-1 group-hover:-right-1 group-hover:border-[#00C2FF] group-hover:opacity-50 z-20 pointer-events-none" />
              
              <div className="w-28 h-28 bg-[#060D10] flex items-center justify-center text-[#00C2FF] shadow-sm overflow-hidden border border-white/5 relative z-10 [clip-path:polygon(15%_0%,_85%_0%,_100%_15%,_100%_85%,_85%_100%,_15%_100%,_0%_85%,_0%_15%)]">
                {/* Scanner line overlay */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-[#00C2FF]/50 shadow-[0_0_10px_#00C2FF] opacity-50 block -translate-y-full hover:animate-[scan_2s_linear_infinite] z-30" />
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,194,255,0.05)_2px,rgba(0,194,255,0.05)_4px)] mix-blend-screen pointer-events-none z-30" />
                
                <Terminal className="w-12 h-12 text-[#00C2FF] drop-shadow-[0_0_10px_currentColor] group-hover:scale-110 transition-transform" />
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left relative z-10 flex flex-col justify-center h-full sm:pl-4">
              {/* Terminal Logging Subtext */}
              <div className="text-[#00E5B0] text-[9px] font-geist-mono uppercase tracking-[0.3em] mb-4 flex items-center justify-center sm:justify-start gap-4 opacity-70">
                <span><span className="text-white/30 mr-1 text-[8px]">DIR:</span>/MISSIONS/TARGET_MATRIX</span>
                <span className="hidden sm:inline text-white/10">|</span>
                <span className="hidden sm:flex items-center gap-1">
                  <span className="w-1 h-3 bg-[#00E5B0] animate-pulse" />
                  <span className="w-1 h-3 bg-[#00E5B0]/40 animate-pulse delay-75" />
                  <span className="w-1 h-3 bg-[#00E5B0]/10 animate-pulse delay-150" />
                </span>
              </div>

              {/* Glitch Typography Title */}
              <div className="relative group inline-block mb-3">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-vt323 tracking-widest uppercase m-0 leading-none text-transparent bg-clip-text bg-[linear-gradient(180deg,#FFFFFF_0%,#A1A1AA_100%)] drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] relative z-10 group-hover:text-white transition-colors flex items-center">
                  <span className="text-[#00C2FF] mr-2 opacity-50 group-hover:opacity-100 transition-opacity">]</span>
                  <span>TARGET MATRIX</span>
                </h1>
                
                {/* Glitch Pseudo-elements */}
                <h1 className="text-5xl md:text-6xl lg:text-7xl flex items-center font-vt323 tracking-widest uppercase m-0 leading-none text-[#00E5B0] absolute top-0 left-[-2px] opacity-0 group-hover:opacity-70 group-hover:animate-[glitch_0.3s_linear_infinite] mix-blend-screen pointer-events-none select-none z-0">
                  <span className="text-transparent mr-2">]</span>
                  <span>TARGET MATRIX</span>
                </h1>
                <h1 className="text-5xl md:text-6xl lg:text-7xl flex items-center font-vt323 tracking-widest uppercase m-0 leading-none text-[#FF1493] absolute top-[2px] left-[2px] opacity-0 group-hover:opacity-70 group-hover:animate-[glitch_0.4s_linear_infinite_reverse] mix-blend-screen pointer-events-none select-none z-0">
                  <span className="text-transparent mr-2">]</span>
                  <span>TARGET MATRIX</span>
                </h1>
              </div>
              
              <p className="text-[#00C2FF] text-xs font-geist-mono tracking-[0.2em] flex flex-col sm:flex-row items-center sm:items-start gap-3 mt-2">
                <span className="lowercase bg-[#00C2FF]/10 border border-white/5 px-2 py-0.5 rounded-sm text-white/80">root@aivon</span> 
                <span className="hidden sm:inline text-white/20">/</span> 
                <span className="flex items-center justify-center gap-2 text-white/60 uppercase">
                  <span className="w-2 h-2 rounded-full bg-[#00E5B0] shadow-[0_0_8px_#00E5B0] animate-pulse" />
                  ACCESS_GRANTED
                </span>
                <span className="hidden sm:inline text-[#00C2FF]/30 text-[10px] sm:ml-auto">0x{mounted ? hexTime : "00000000"}</span>
              </p>
            </div>
            
            {/* Active Encrypted Node Block (Like Neural Rating) */}
            <div className="text-center sm:text-right shrink-0 relative z-10 bg-[#0A0F14]/80 border-[0.5px] border-white/5 p-5 rounded-none shadow-hacker-glow min-w-[160px] group overflow-hidden mt-6 md:mt-0">
              {/* Corner Brackets */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white/5 group-hover:border-[#FACC15] transition-colors" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white/5 group-hover:border-[#FACC15] transition-colors" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white/5 group-hover:border-[#FACC15] transition-colors" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white/5 group-hover:border-[#FACC15] transition-colors" />

              {/* Scanning background line */}
              <div className="absolute -left-full top-1/2 w-[200%] h-[1px] bg-[#FACC15]/20 -rotate-45 block transform -translate-y-1/2 group-hover:animate-[scan_3s_linear_infinite]" />

              <div className="text-[9px] font-bold text-[#FACC15]/70 font-geist-mono tracking-[0.2em] uppercase mb-1 flex items-center justify-center sm:justify-end gap-2 relative z-10">
                <span className="w-1.5 h-1.5 bg-[#FACC15] animate-pulse" />
                NEURAL RATING
              </div>
              
              <div className="relative flex items-center justify-center sm:justify-end mt-2 mb-1">
                {/* Decorative spinning ring */}
                <div className="absolute w-14 h-14 border border-dashed border-white/5 rounded-full animate-[spin_15s_linear_infinite]" />
                <div className="absolute w-10 h-10 border border-white/5 rounded-full animate-[spin_10s_linear_infinite_reverse]" />
                
                <div className="text-5xl font-vt323 text-[#FACC15] drop-shadow-[0_0_15px_rgba(250,204,21,0.4)] relative z-10 group-hover:text-white transition-colors duration-300">
                  {userRating}
                </div>
              </div>
              
              {/* Hex Data Stream */}
              <div className="bg-[#05070A] px-2 py-0.5 mt-3 border border-white/5 text-[8px] font-geist-mono text-[#FACC15]/50 flex justify-between items-center relative z-10 overflow-hidden group-hover:text-[#FACC15]/80 transition-colors">
                <span>0xAF{mounted ? randHex : "0"}9</span>
                <span className="group-hover:animate-pulse">PRC_RUN</span>
              </div>
            </div>

          </div>
        </div>

        {/* Compact Stats Side-Array (Profile HUD Style) */}
        <div className="xl:w-[450px] bg-[#05070A]/80 border-[0.5px] border-white/5 p-1 relative group overflow-hidden shadow-hacker-glow flex flex-col h-full">
           {/* Structural Frame & Corners */}
           <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/30 group-hover:border-white/5 transition-colors" />
           <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/30 group-hover:border-white/5 transition-colors" />
           <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/30 group-hover:border-white/5 transition-colors" />
           <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/30 group-hover:border-white/5 transition-colors" />

           {/* Faux HUD Header */}
           <div className="absolute top-1 left-4 flex gap-4 text-[7px] font-geist-mono text-white/30 tracking-[0.2em] font-bold">
             <span className="flex items-center gap-1"><span className="w-1 h-1 bg-[#00C2FF] animate-pulse rounded-full" /> TARGET_LINK: STABLE</span>
           </div>

           {/* Seamless Array Container */}
           <div className="flex flex-col sm:flex-row xl:flex-col items-stretch xl:justify-center pt-6 pb-2 px-4 relative z-10 w-full h-full xl:py-10">
              {[
                { label: "IDENTIFIED", value: total.toLocaleString(), color: "text-[#00C2FF]" },
                { label: "ENTRY_LVL", value: `~${Math.max(10, Math.floor((userSolved / Math.max(1, total)) * 100))}%`, color: "text-[#00E5B0]" },
                { label: "X-RISK", value: `~${Math.max(5, 100 - Math.floor((userSolved / Math.max(1, total)) * 100))}%`, color: "text-[#FF5F56]" }
              ].map((stat, idx, arr) => (
                <div key={idx} className="flex xl:flex-row items-center w-full h-full group/metric relative py-4 xl:py-2">
                  <div className="flex flex-col items-center sm:items-start flex-1 px-2 xl:px-8">
                    <div className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-geist-mono font-bold mb-1 transition-colors group-hover/metric:text-white/60 flex items-center gap-2">
                      <span className="opacity-0 group-hover/metric:opacity-100 text-[10px] text-[#00C2FF] transition-opacity">►</span>
                      {stat.label}
                    </div>
                    <div className={`text-4xl sm:text-5xl font-vt323 tracking-widest ${stat.color} drop-shadow-[0_0_10px_currentColor]/30 group-hover/metric:drop-shadow-[0_0_15px_currentColor]/60 transition-all`}>
                      {stat.value}
                    </div>
                  </div>

                  {/* Array Separators */}
                  {idx < arr.length - 1 && (
                    <div className="hidden sm:flex xl:hidden self-stretch items-center justify-center px-4 relative">
                      <div className="text-white/10 font-geist-mono text-4xl font-light italic select-none transform skew-x-12">
                        /
                      </div>
                    </div>
                  )}
                  {idx < arr.length - 1 && (
                    <div className="sm:hidden xl:block absolute bottom-0 left-16 right-16 xl:left-8 xl:right-8 xl:bottom-0 h-[1px] bg-white/5" />
                  )}
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* ── Seamless Control Bar (Search & Filters) ── */}
      <div className="w-full mb-6 flex flex-col md:flex-row gap-4 stagger-2 animate-fade-in-up items-center relative z-20 bg-[#0A0F14]/40 p-4 rounded-2xl border-[0.5px] border-white/5 shadow-hacker-glow">
        
        {/* Search Pill */}
        <div className="flex-1 w-full bg-[#05070A]/80 border-[0.5px] border-white/5 rounded-xl px-5 py-3 relative group focus-within:border-white/5 transition-all flex items-center gap-4 overflow-hidden shadow-inner">
          <Terminal className="w-4 h-4 text-[#00E5B0] shrink-0 opacity-50 group-focus-within:opacity-100 transition-opacity" />
          <input
            id="problem-search"
            aria-label="Search problems"
            placeholder="Search Target Matrix..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none text-[13px] font-space-grotesk text-white placeholder-white/30 outline-none tracking-wide"
          />
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#00C2FF]/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
        </div>

        {/* Filter Trigger Button (Premium style matching View Profile) */}
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`shrink-0 flex items-center gap-3 px-6 py-3.5 rounded-xl border text-[11px] font-geist-mono font-bold uppercase tracking-[0.15em] transition-all relative overflow-hidden group/filter outline-none shadow-sm ${
            isFilterOpen || activeFiltersCount > 0
              ? "bg-[#00C2FF]/10 text-[#00C2FF] border-white/5 shadow-sm" 
              : "bg-[#05070A]/80 text-white/60 border-white/5 hover:border-white/5 hover:text-[#00C2FF] hover:shadow-sm"
          }`}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00C2FF]/10 to-transparent -translate-x-full group-hover/filter:translate-x-full transition-transform duration-1000" />
          
          <div className="flex items-center gap-3 z-10">
            <span className={`w-1.5 h-1.5 rounded-full ${isFilterOpen || activeFiltersCount > 0 ? "bg-[#00C2FF] animate-pulse" : "bg-white/20 group-hover/filter:bg-[#00C2FF] group-hover/filter:animate-ping"}`} />
            <Filter className="w-4 h-4" />
            <span>[ SYSTEM FILTERS ]</span>
            {activeFiltersCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-md bg-[#00C2FF] text-[#05070A] text-[10px] ml-1 shadow-[0_0_8px_#00C2FF]">
                {activeFiltersCount}
              </span>
            )}
          </div>
        </button>

        {/* Filter Tactical Modal Overlay */}
        {isFilterOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in group/modal">
            {/* Backdrop with motion blur */}
            <div 
              className="absolute inset-0 bg-[#05070A]/80 transition-opacity"
              onClick={() => setIsFilterOpen(false)}
            />
            
            {/* Modal Container */}
            <div className="relative w-full max-w-[500px] bg-[#0A0F14]/95 border border-white/5 rounded-2xl shadow-sm overflow-hidden animate-zoom-in z-10 flex flex-col max-h-[90vh]">
              {/* Corner Brackets for Hacker Aesthetic */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00C2FF] z-20 pointer-events-none" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00C2FF] z-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00C2FF] z-20 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00C2FF] z-20 pointer-events-none" />

              {/* Panel Header */}
              <div className="flex justify-between items-center px-6 py-5 border-b border-white/5 bg-[#060D10]">
                <span className="text-white font-geist-mono text-[11px] uppercase tracking-[0.2em] font-bold flex items-center gap-3">
                  <span className="w-2 h-2 rounded-sm bg-[#00C2FF] animate-pulse shadow-[0_0_8px_#00C2FF]" /> [ // FILTER_MATRIX_PROTOCOL ]
                </span>
                <div className="flex items-center gap-4">
                   {activeFiltersCount > 0 && (
                     <button onClick={clearFilters} className="text-[10px] font-geist-mono text-white/50 hover:text-[#FF5F56] transition-colors uppercase tracking-[0.1em]">
                       [ PURGE_FILTERS ]
                     </button>
                   )}
                   <button onClick={() => setIsFilterOpen(false)} className="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                     <X className="w-5 h-5" />
                   </button>
                </div>
              </div>

              {/* Scrollable Content Arena */}
              <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
                {/* Difficulty Section */}
                <div className="group/diff">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1 h-3 bg-[#00E5B0] opacity-50" />
                    <span className="text-white/50 font-geist-mono text-[10px] uppercase tracking-[0.2em]">Threat Rating Level:</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {DIFFICULTIES.slice(1).map((d) => {
                      let activeClass = "";
                      if (d === "EASY") activeClass = "bg-[#00E5B0]/15 text-[#00E5B0] border-white/5 shadow-sm";
                      if (d === "MEDIUM") activeClass = "bg-[#FACC15]/15 text-[#FACC15] border-white/5 shadow-[0_0_15px_rgba(250,204,21,0.2)]";
                      if (d === "HARD") activeClass = "bg-[#FF5F56]/15 text-[#FF5F56] border-white/5 shadow-[0_0_15px_rgba(255,95,86,0.2)]";

                      return (
                        <button key={d} onClick={() => { setDifficulty(difficulty === d ? "" : d); setPage(1); }}
                           className={`flex items-center gap-2 px-6 py-2.5 rounded-xl border text-[11px] font-geist-mono font-bold uppercase tracking-[0.1em] transition-all outline-none ${
                             difficulty === d 
                               ? activeClass 
                               : "bg-[#05070A]/50 text-white/40 border-white/10 hover:text-white hover:border-white/5 hover:bg-[#060D10]"
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
                <div className="group/tag">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1 h-3 bg-[#00C2FF] opacity-50" />
                    <span className="text-white/50 font-geist-mono text-[10px] uppercase tracking-[0.2em]">Parameter Keywords:</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {TAGS.map((t) => (
                      <button key={t} onClick={() => { setTag(tag === t ? "" : t); setPage(1); }}
                        className={`px-4 py-2 rounded-lg text-[10px] font-space-grotesk tracking-widest uppercase transition-all duration-300 border ${
                           tag === t 
                              ? "bg-[#00C2FF]/15 text-[#00C2FF] border-white/5 shadow-sm" 
                              : "bg-[#05070A]/50 text-white/40 border-white/5 hover:border-white/5 hover:text-white hover:bg-[#060D10]"
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rows to Show */}
                <div className="group/limit">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1 h-3 bg-[#FACC15] opacity-50" />
                    <span className="text-white/50 font-geist-mono text-[10px] uppercase tracking-[0.2em]">Data Stream Limit:</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {[10, 20, 50].map((l) => (
                      <button key={l} onClick={() => { setLimit(l); setPage(1); }}
                        className={`px-5 py-2 border rounded-lg text-[11px] font-geist-mono font-bold tracking-[0.1em] transition-all ${
                          limit === l 
                            ? "bg-[#00C2FF]/10 text-[#00C2FF] border-white/5 shadow-sm" 
                            : "bg-[#05070A]/50 text-white/40 border-white/10 hover:border-white/5 hover:text-white"
                        }`}
                      >
                        {l} ROWS
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Footer with Execute Button */}
              <div className="p-4 border-t border-white/5 bg-[#060D10] flex justify-end relative">
                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="relative group px-8 py-3 bg-[#05070A] border border-[#FF2A2A]/40 hover:border-[#FF2A2A] text-[#FF2A2A] hover:bg-[#FF2A2A]/10 hover:shadow-[0_0_15px_rgba(255,42,42,0.3)] font-geist-mono font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-300 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    <Zap className="w-3.5 h-3.5 group-hover:animate-pulse" />
                    [ EXECUTE_FILTERS ]
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FF2A2A]/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
                </button>
              </div>
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
           <span className="text-[10px] font-geist-mono text-[#00E5B0] tracking-[0.1em] hidden sm:flex items-center gap-2 border border-white/5 bg-[#00E5B0]/10 px-3 py-1 rounded-full">
             <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
             DATA_STREAM: CONNECTED
           </span>
         </div>

         {/* Dossier Column Headers */}
         <div className="px-8 py-3 mb-2 flex items-center gap-4 sm:gap-6 text-[9px] font-geist-mono text-white/20 uppercase tracking-[0.25em] font-bold">
            <div className="w-14 sm:w-20 text-center shrink-0">CODE_ID</div>
            <div className="flex-1 pl-2 text-left">TARGET_MISSION</div>
            <div className="w-24 md:w-32 text-left shrink-0">THREAT_LVL</div>
            <div className="hidden lg:flex flex-1 text-left">PARAMS</div>
            <div className="w-28 sm:w-36 text-right shrink-0">ACTION</div>
         </div>

         {/* Floating Card List */}
         <div className="flex flex-col gap-3 relative z-10 w-full">
             {loading ? (
                  <div className="p-24 text-center w-full flex flex-col items-center gap-6 relative z-10 bg-[#0A0F14]/60 backdrop-blur-2xl border-[0.5px] border-white/10 rounded-3xl shadow-hacker-glow">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-white/5 border-t-[#00C2FF] rounded-full animate-spin" />
                      <Terminal className="w-6 h-6 text-[#00C2FF] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <span className="text-[#00C2FF] font-geist-mono text-sm uppercase tracking-[0.2em] font-bold drop-shadow-[0_0_8px_#00C2FF]">
                      Executing Data Sweep...
                    </span>
                  </div>
             ) :
 problems.length === 0 ? (
                 <div className="p-24 text-center w-full flex flex-col items-center gap-6 relative z-10 bg-[#0A0F14]/60 border border-white/5 rounded-3xl shadow-sm">
                     <span className="text-[#FF5F56] font-geist-mono text-xs uppercase tracking-[0.2em] font-bold">
                       [ NULL_RESPONSE: NO_TARGETS_FOUND ]
                     </span>
                     <span className="text-white/40 font-geist-mono text-[10px] tracking-widest break-words max-w-sm">
                       Adjust search parameters or system filters to re-establish connection to operative targets.
                     </span>
                 </div>
            ) : problems.map((problem, i) => {
                 const diffColors: Record<string, string> = { 
                   EASY: "text-[#00E5B0] border-white/5 bg-[#00E5B0]/10", 
                   MEDIUM: "text-[#FACC15] border-white/5 bg-[#FACC15]/10", 
                   HARD: "text-[#FF5F56] border-white/5 bg-[#FF5F56]/10" 
                 };
                 const diffClass = diffColors[problem.difficulty.toUpperCase()] || "text-white border-white/20 bg-white/5";
                 const paddedIndex = String((page - 1) * limit + i + 1).padStart(4, '0');
                 
                 return (
                  <div key={problem.id} className="relative group/row bg-[#0A0F14]/40 border-[0.5px] border-white/10 hover:border-white/5 hover:bg-[#0A0F14]/80 rounded-xl transition-all duration-500 overflow-hidden flex items-center justify-between p-1 hover:-translate-y-[2px] shadow-sm hover:shadow-hacker-glow">
                     
                     {/* Dynamic Hover Gradient Sweep */}
                     <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#00E5B0] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-500 pointer-events-none" />
                     <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-[#00E5B0] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-500 pointer-events-none" />
                     
                     <div className="flex items-center gap-4 sm:gap-6 px-6 py-5 w-full bg-gradient-to-br from-white/[0.02] to-transparent rounded-lg relative z-10">
                       
                       {/* 1. PID (Hex Padded Index) */}
                       <div className="w-14 sm:w-20 text-center shrink-0">
                         <span className="text-[11px] md:text-[13px] font-geist-mono text-white/30 tracking-[0.2em] font-bold group-hover/row:text-[#00E5B0]/80 transition-colors">0x{paddedIndex}</span>
                       </div>

                       {/* 2. Title & Status */}
                       <div className="flex-1 pl-2 truncate relative z-10 flex flex-col justify-center">
                          <Link href={`/problems/${problem.slug}`} className="font-space-grotesk font-bold text-[18px] md:text-[20px] tracking-wide text-white/80 group-hover/row:text-white transition-all truncate block drop-shadow-sm group-hover/row:drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] capitalize">
                            {problem.title.replace(/-/g, " ")}
                          </Link>
                          <div className="flex items-center gap-3 mt-1.5 opacity-60 group-hover/row:opacity-100 transition-opacity">
                             <span className="text-[9px] font-geist-mono text-white/40 tracking-[0.2em] uppercase">Sys.Link: </span>
                             <span className="text-[9px] font-geist-mono text-[#00E5B0] bg-[#00E5B0]/10 px-2 py-0.5 rounded-sm border border-white/5 tracking-widest uppercase flex items-center gap-1.5">
                               <span className="w-1 h-1 rounded-full bg-[#00E5B0] shadow-[0_0_5px_#00E5B0]" /> ONLINE
                             </span>
                          </div>
                       </div>

                       {/* 3. Threat Level */}
                       <div className="w-24 md:w-32 text-left shrink-0 relative z-10 flex flex-col justify-center">
                          <span className={`text-[10px] font-bold font-geist-mono tracking-[0.2em] uppercase px-3 py-1 rounded-sm border flex items-center gap-2 ${diffClass}`}>
                             <span className="w-1 h-1 rounded-full bg-current shadow-[0_0_5px_currentColor]" />
                             {problem.difficulty}
                          </span>
                       </div>

                       {/* 4. Tags (Parameters) */}
                       <div className="hidden lg:flex flex-1 gap-2 flex-wrap relative z-10">
                          {(problem.tags || []).slice(0, 3).map((t) => (
                            <span key={t} className="text-[10px] font-geist-mono text-[#00C2FF]/70 bg-[#00C2FF]/10 px-3 py-1.5 rounded-md uppercase tracking-widest whitespace-nowrap border border-white/5 group-hover/row:border-white/5 transition-colors shadow-sm">
                              {t}
                            </span>
                          ))}
                       </div>

                       {/* 5. Action */}
                       <div className="w-28 sm:w-36 text-right shrink-0 flex justify-end relative z-10">
                         <Link href={`/problems/${problem.slug}`} 
                           className="relative flex items-center justify-center gap-2 overflow-hidden group/btn px-6 py-2.5 rounded-lg border border-white/10 bg-white/5 text-[9px] sm:text-[11px] font-geist-mono font-bold uppercase tracking-[0.1em] text-white/80 hover:text-white hover:border-white/5 hover:bg-[#00E5B0]/10 hover:shadow-sm transition-all duration-300">
                           <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#00E5B0] to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                           <Terminal className="w-3 h-3 group-hover/btn:-translate-x-1 group-hover/btn:text-[#00E5B0] text-white/50 transition-all" />
                           <span>ENGAGE</span>
                         </Link>
                       </div>

                     </div>
                  </div>
                 );
               })}
         </div>

        {/* ── Dashboard Style Pagination ── */}
        <div className="flex justify-between items-center w-full mt-10 p-4 relative bg-[#0A0F14]/60 rounded-2xl border border-white/5 shadow-sm">
          <button 
            onClick={() => setPage(Math.max(1, page - 1))} 
            disabled={page === 1} 
            className="px-6 md:px-10 py-3.5 text-[11px] md:text-[12px] font-geist-mono font-bold uppercase tracking-[0.2em] text-[#00C2FF]/80 hover:text-[#00C2FF] bg-[#00C2FF]/5 hover:bg-[#00C2FF]/15 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-white/5 hover:border-white/5 rounded-xl flex items-center gap-3 shadow-sm hover:shadow-sm"
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
            className="px-6 md:px-10 py-3.5 text-[11px] md:text-[12px] font-geist-mono font-bold uppercase tracking-[0.2em] text-[#00E5B0]/80 hover:text-[#00E5B0] bg-[#00E5B0]/5 hover:bg-[#00E5B0]/15 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-white/5 hover:border-white/5 rounded-xl flex items-center gap-3 shadow-sm hover:shadow-sm"
          >
            NEXT_BLOCK <span className="text-[16px]">{'>'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
