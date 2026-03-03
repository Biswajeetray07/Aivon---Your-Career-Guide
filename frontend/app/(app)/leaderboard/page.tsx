"use client";
import { useState, useEffect } from "react";
import { getLeaderboard } from "@/lib/api";
import { Shield, Sparkles } from "lucide-react";
import { useLiveSocket } from "@/hooks/useLiveSocket";
import { motion, AnimatePresence } from "framer-motion";

type LeaderboardEntry = { rank: number; userId: string; name: string | null; email: string; rating: number; solved: number };

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const { connected, listen } = useLiveSocket(["leaderboard"]);

  useEffect(() => {
    getLeaderboard().then((d) => setData(d.leaderboard)).catch(e => console.warn("Leaderboard fetch failed:", e.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const unlisten = listen("leaderboard_update", (payload: any) => {
      setData((prev) => {
        const idx = prev.findIndex(p => p.userId === payload.userId);
        let newData = [...prev];
        if (idx !== -1) {
          newData[idx] = { ...newData[idx], rating: payload.newRating, solved: (newData[idx].solved || 0) + 1 };
        } else {
          newData.push({
            rank: 999,
            userId: payload.userId,
            name: payload.name,
            email: "N/A", 
            rating: payload.newRating,
            solved: 1
          });
        }
        newData.sort((a, b) => b.rating - a.rating);
        newData.forEach((entry, i) => { entry.rank = i + 1; });
        return newData;
      });
    });
    return unlisten;
  }, [listen]);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return "text-[#FF5F56] drop-shadow-[0_0_20px_rgba(255,95,86,0.6)]";
      case 2: return "text-[#FACC15] drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]";
      case 3: return "text-[#00E5B0] drop-shadow-sm";
      default: return "text-[#00C2FF]";
    }
  };

  const getRankAvatarStyle = (rank: number) => {
    switch (rank) {
      case 1: return "border-[#FF5F56] text-[#FF5F56] shadow-[0_0_20px_rgba(255,95,86,0.3)] bg-[#FF5F56]/10";
      case 2: return "border-[#FACC15] text-[#FACC15] shadow-[0_0_15px_rgba(250,204,21,0.2)] bg-[#FACC15]/10";
      case 3: return "border-[#00E5B0] text-[#00E5B0] shadow-sm bg-[#00E5B0]/10";
      default: return "border-white/5 text-[#00C2FF]/50 bg-[#0A0F14]";
    }
  };

  const getRankBracketClass = (rank: number) => {
    switch (rank) {
      case 1: return "border-[#FF5F56]";
      case 2: return "border-[#FACC15]";
      case 3: return "border-[#00E5B0]";
      default: return "border-white/10 group-hover:border-white/5";
    }
  };

  const getRankDesignation = (rank: number) => {
    switch (rank) {
      case 1: return { label: "PRIME_ALPHA", color: "text-[#FF5F56]" };
      case 2: return { label: "PRIME_BETA", color: "text-[#FACC15]" };
      case 3: return { label: "PRIME_GAMMA", color: "text-[#00E5B0]" };
      default: return { label: "OPERATIVE", color: "text-white/40 group-hover:text-white/70" };
    }
  };

  return (
    <div className="min-h-screen pt-[120px] pb-20 w-full max-w-[1500px] mx-auto px-6 md:px-12 font-space-grotesk flex flex-col items-center relative z-10 bg-transparent">
        
        {/* ── Unified Tactical HUD (Leaderboard Header) ── */}
        <div className="w-full mb-12 stagger-1 animate-fade-in-up flex flex-col xl:flex-row gap-8 items-stretch relative z-10">
          
          {/* Global Nexus Operative Dossier Header (Matching VerdictHeader Style) */}
          <div className="border border-white/5 rounded-xl overflow-hidden shadow-lg relative bg-[#060D10]/80 w-full flex flex-col transition-colors duration-500">
            
            {/* Top Tech Bar */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-white/5 bg-[#0A0F14]/90 shrink-0 relative z-10 w-full">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-black/50 rounded-sm border border-white/5">
                  <div className={`w-1.5 h-1.5 rounded-sm ${connected ? 'bg-[#00E5B0] animate-pulse shadow-[0_0_5px_#00E5B0]' : 'bg-[#FF5F56] shadow-[0_0_5px_#FF5F56]'}`} />
                  <div className="w-1.5 h-1.5 rounded-sm bg-white/20" />
                  <div className="w-1.5 h-1.5 rounded-sm bg-white/20" />
                </div>
              </div>
              <span className="absolute left-1/2 -translate-x-1/2 text-[9px] font-geist-mono text-[#00E5B0]/50 tracking-[0.2em] uppercase">
                GLOBAL NEXUS
              </span>
              <div className="flex gap-4">
                <span className="text-[#00E5B0]/40 text-[10px] uppercase font-bold tracking-widest hidden sm:inline-block">SYS.RDY</span>
              </div>
            </div>
            
            <div className="p-8 md:p-10 relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 h-full flex-grow border-l-4 border-[#00C2FF] bg-[#060D10]/80">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(0,194,255,0.05)_90deg,transparent_90deg)] animate-[spin_10s_linear_infinite] pointer-events-none mix-blend-screen opacity-50 block" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,194,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,194,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

              <div className="flex-1 text-center sm:text-left relative z-10 flex flex-col justify-center h-full sm:pl-4">
                {/* Terminal Logging Subtext */}
                <div className="text-[#00C2FF] text-[10px] sm:text-[11px] font-geist-mono uppercase tracking-[0.3em] mb-4 flex items-center justify-center sm:justify-start gap-4">
                  <span><span className="text-white/30 mr-1 text-[9px]">SYS.DIR // </span>MODULES/GLOBAL_NEXUS</span>
                  <span className="hidden sm:inline text-white/10">|</span>
                  <span className="hidden sm:flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-[#00C2FF] animate-pulse shadow-[0_0_5px_#00C2FF]" />
                    <span className="w-1.5 h-3 bg-[#00C2FF]/40 animate-pulse delay-75" />
                    <span className="w-1.5 h-3 bg-[#00C2FF]/10 animate-pulse delay-150" />
                  </span>
                </div>

                {/* Typography Title */}
                <div className="relative group inline-block mb-3">
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-vt323 uppercase tracking-widest mb-1 text-transparent bg-clip-text bg-[linear-gradient(180deg,#FFFFFF_0%,#A1A1AA_100%)] drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] relative z-10 group-hover:text-white transition-colors">
                    <span className="text-[#00C2FF] mr-2 opacity-50 group-hover:opacity-100 transition-opacity">]</span>
                    GLOBAL NEXUS
                  </h1>
                  {/* Glitch Pseudo-elements on hovering container */}
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-vt323 uppercase tracking-widest mb-1 text-[#00E5B0] absolute top-0 left-[-2px] opacity-0 group-hover:opacity-70 group-hover:animate-[glitch_0.3s_linear_infinite] mix-blend-screen pointer-events-none select-none z-0">
                    <span className="text-transparent mr-2">]</span>
                    GLOBAL NEXUS
                  </h1>
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-vt323 uppercase tracking-widest mb-1 text-[#FF1493] absolute top-[2px] left-[2px] opacity-0 group-hover:opacity-70 group-hover:animate-[glitch_0.4s_linear_infinite_reverse] mix-blend-screen pointer-events-none select-none z-0">
                    <span className="text-transparent mr-2">]</span>
                    GLOBAL NEXUS
                  </h1>
                </div>
                
                <p className="text-[#00C2FF] text-[10px] sm:text-xs font-geist-mono tracking-[0.2em] flex flex-col sm:flex-row items-center sm:items-start gap-3 mt-4">
                  <span className="lowercase bg-[#00C2FF]/10 border border-[#00C2FF]/20 px-2.5 py-1 rounded-sm text-[#00C2FF]">root@aivon</span> 
                  <span className="hidden sm:inline text-white/20">/</span> 
                  <span className="flex items-center justify-center gap-2 text-[#00E5B0] font-bold uppercase">
                    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#00E5B0] shadow-[0_0_8px_#00E5B0] animate-pulse' : 'bg-red-500 shadow-[0_0_8px_red] animate-pulse'}`} />
                    {connected ? 'LIVE_STREAM_ACTIVE' : 'SOCKET_DISCONNECTED'}
                  </span>
                </p>
              </div>

              {/* Nexus Stats Block */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 shrink-0 relative z-10 border-l border-white/10 pl-8 hidden lg:grid">
                {[
                  { label: "CONNECTED_OPERATIVES", value: data.length.toString().padStart(4, '0'), unit: "PX" },
                  { label: "RANKING_ALGORITHM", value: "RSA_4096", unit: "V2" },
                  { label: "NEXUS_COORDINATES", value: "0xFC_229", unit: "LOC" },
                  { label: "SATELLITE_UPLINK", value: "STABLE", unit: "OK" }
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-start gap-1 group/stat">
                    <div className="flex items-center gap-2">
                       <span className="text-[8px] font-bold text-white/20 group-hover/stat:text-[#00C2FF] transition-colors">►</span>
                       <span className="text-[9px] font-bold text-white/40 font-geist-mono tracking-[0.2em] uppercase whitespace-nowrap">{stat.label}</span>
                    </div>
                    <div className="font-vt323 text-2xl text-[#00E5B0] tracking-widest group-hover/stat:text-white transition-colors duration-300 flex items-baseline gap-1">
                      {stat.value}
                      <span className="text-[10px] text-white/20 font-geist-mono">{stat.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full stagger-2 animate-fade-in-up relative flex flex-col">
          {/* Massive Master Terminal Container */}
          <div className="bg-[#0A0F14]/40 backdrop-blur-2xl border-[0.5px] border-white/10 shadow-hacker-glow relative flex flex-col w-full overflow-hidden rounded-xl">
             {/* Master Corner Brackets */}
             <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#00C2FF] z-20 pointer-events-none drop-shadow-sm" />
             <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#00C2FF] z-20 pointer-events-none drop-shadow-sm" />
             <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#00C2FF] z-20 pointer-events-none drop-shadow-sm" />
             <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#00C2FF] z-20 pointer-events-none drop-shadow-sm" />
             
             {/* Master Header */}
             <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-[#060D10]/80 backdrop-blur-md relative z-10 w-full shadow-inner">
               <span className="text-[10px] sm:text-[12px] font-geist-mono text-[#00C2FF] tracking-[0.2em] font-bold flex items-center gap-3">
                 <span className="text-white animate-pulse">■</span> [ // GLOBAL_NEXUS_UPLINK ]
               </span>
               <span className="text-[8px] sm:text-[10px] font-geist-mono text-[#00C2FF]/50 tracking-[0.2em] hidden sm:block uppercase">Live_Feed: {connected ? 'Active' : 'Pending'}</span>
             </div>

             {/* Table Headers (Clean Data Alignment) */}
             <div className="px-5 py-3 border-b border-white/5 bg-[#0A0F14]/60 backdrop-blur-sm flex items-center gap-4 sm:gap-6 text-[9px] sm:text-[11px] font-geist-mono text-[#00C2FF]/70 uppercase tracking-[0.2em] font-bold">
                <div className="w-12 sm:w-20 text-center">Rank</div>
                <div className="flex-1 pl-2">Operative</div>
                <div className="w-20 sm:w-28 text-right">Rating</div>
                <div className="w-16 sm:w-24 text-right">Targets</div>
                <div className="hidden lg:block w-[130px] text-right">Clearance</div>
             </div>

             <div className="flex flex-col relative z-10 bg-transparent min-h-[300px]">
               {/* Background Scanline within Container */}
               <div className="absolute inset-0 bg-[linear-gradient(rgba(0,194,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,194,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-40 mix-blend-screen" />

               {loading ? (
                 <div className="w-full h-full border border-transparent flex flex-col items-center justify-center relative p-12">
                   <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#00C2FF]" />
                   <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#00C2FF]" />
                   <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#00C2FF]" />
                   <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#00C2FF]" />
                   <span className="text-[#00C2FF] font-geist-mono tracking-[0.2em] animate-pulse flex items-center gap-3 uppercase text-xs">
                     <Shield className="w-4 h-4" /> Initializing Satellite Uplink <span className="w-2 h-4 bg-[#00C2FF] animate-pulse" />
                   </span>
                 </div>
               ) : (
                 <AnimatePresence mode="popLayout">
                   {data.map((entry, idx) => (
                      <motion.div 
                         layout
                         key={entry.userId}
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0, scale: 0.95 }}
                         transition={{ type: "spring", stiffness: 350, damping: 25 }}
                         className="px-5 py-4 border-b border-white/5 relative group flex items-center gap-4 sm:gap-6 hover:bg-[#00C2FF]/[0.03] transition-colors bg-[#060D10]/50"
                      >
                         {/* Left Active Edge Indicator */}
                         <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${getRankAvatarStyle(entry.rank).split(' ')[0].replace('border-', 'bg-')} shadow-[0_0_15px_currentColor] scale-y-0 group-hover:scale-y-100 transition-transform origin-center duration-300 z-20`} />
                       
                         {/* Scanline Gradient Overlay on Hover */}
                         <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-${getRankAvatarStyle(entry.rank).split(' ')[0].replace('border-', '')}/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1.5s] ease-in-out pointer-events-none z-0`} />

                         {/* 1. Rank */}
                         <div className="flex items-center justify-center w-12 sm:w-20 relative z-10 shrink-0">
                           <div className={`text-2xl sm:text-4xl font-vt323 tracking-widest text-center ${getRankColor(entry.rank)}`}>
                              {entry.rank < 10 ? `0${entry.rank}` : entry.rank}
                           </div>
                         </div>
                       
                         {/* 2. Operative Avatar & Name */}
                         <div className="flex items-center gap-4 flex-1 relative z-10 w-full overflow-hidden pl-2">
                            <div className={`hidden sm:flex w-11 h-11 shrink-0 items-center justify-center border-2 font-black text-xl [font-family:'Space_Grotesk'] ${getRankAvatarStyle(entry.rank)} ${entry.rank === 1 ? 'animate-pulse' : ''}`}>
                               {entry.name?.[0]?.toUpperCase() || entry.email[0].toUpperCase()}
                            </div>
                            <div className="flex flex-col truncate w-full">
                              <span className={`font-space-grotesk font-black text-[15px] sm:text-[19px] uppercase tracking-wider truncate transition-colors ${entry.rank <= 3 ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                                {entry.name || entry.email.split('@')[0]}
                              </span>
                              <span className="font-geist-mono text-[9px] sm:text-[10px] text-[#00C2FF]/40 tracking-[0.2em] uppercase mt-1 group-hover:text-[#00C2FF]/80 transition-colors">
                                ID// {entry.userId.slice(0, 8)}
                              </span>
                            </div>
                         </div>
                       
                         {/* 3. Rating & Solved */}
                         <div className="w-20 sm:w-28 text-right relative z-10 shrink-0">
                            <span className={`text-[22px] sm:text-[28px] font-vt323 tracking-widest ${entry.rank <= 3 ? getRankColor(entry.rank) : 'text-[#00E5B0] group-hover:drop-shadow-sm group-hover:text-white'} transition-all`}>{entry.rating}</span>
                         </div>
                         <div className="w-16 sm:w-24 text-right relative z-10 shrink-0">
                            <span className="text-[20px] sm:text-[26px] font-vt323 tracking-widest text-white/50 group-hover:text-white transition-colors">{entry.solved}</span>
                         </div>
                     
                       {/* 4. Designation Badges */}
                       <div className="hidden lg:flex w-[130px] justify-end relative z-10 shrink-0">
                          <div className="font-geist-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] flex items-center justify-end gap-2 text-right w-full">
                             {entry.rank <= 3 && <Sparkles size={12} className={`${getRankDesignation(entry.rank).color} animate-pulse`} />}
                             <span className={`${getRankDesignation(entry.rank).color} ${entry.rank <= 3 ? 'drop-shadow-[0_0_8px_currentColor]' : ''}`}>[{getRankDesignation(entry.rank).label}]</span>
                          </div>
                       </div>
                    </motion.div>
                   ))}
                 </AnimatePresence>
               )}
           </div>
        </div>
      </div>
    </div>
  );
}
