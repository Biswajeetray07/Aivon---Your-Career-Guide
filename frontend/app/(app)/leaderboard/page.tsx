"use client";
import { useEffect, useState } from "react";
import { getLeaderboard } from "@/lib/api";
import { Shield, Sparkles } from "lucide-react";

type LeaderboardEntry = { rank: number; userId: string; name: string | null; email: string; rating: number; solved: number };

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard().then((d) => setData(d.leaderboard)).catch(e => console.warn("Leaderboard fetch failed:", e.message)).finally(() => setLoading(false));
  }, []);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return "text-[#FF5F56] drop-shadow-[0_0_20px_rgba(255,95,86,0.6)]";
      case 2: return "text-[#FACC15] drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]";
      case 3: return "text-[#00E5B0] drop-shadow-[0_0_15px_rgba(0,229,176,0.5)]";
      default: return "text-[#00C2FF]";
    }
  };

  const getRankAvatarStyle = (rank: number) => {
    switch (rank) {
      case 1: return "border-[#FF5F56] text-[#FF5F56] shadow-[0_0_20px_rgba(255,95,86,0.3)] bg-[#FF5F56]/10";
      case 2: return "border-[#FACC15] text-[#FACC15] shadow-[0_0_15px_rgba(250,204,21,0.2)] bg-[#FACC15]/10";
      case 3: return "border-[#00E5B0] text-[#00E5B0] shadow-[0_0_15px_rgba(0,229,176,0.2)] bg-[#00E5B0]/10";
      default: return "border-[#00C2FF]/30 text-[#00C2FF]/50 bg-[#0A0F14]";
    }
  };

  const getRankBracketClass = (rank: number) => {
    switch (rank) {
      case 1: return "border-[#FF5F56]";
      case 2: return "border-[#FACC15]";
      case 3: return "border-[#00E5B0]";
      default: return "border-white/10 group-hover:border-[#00C2FF]/50";
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
    <div className="min-h-screen pt-28 pb-20 container mx-auto px-6 md:px-12 font-space-grotesk flex flex-col items-center">
      <div className="w-full max-w-5xl mb-12 border-b border-[#00C2FF]/20 pb-8 stagger-1 animate-fade-in-up flex items-center justify-between">
        <div>
           <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
             Global Nexus
           </h1>
           <p className="text-[#00C2FF]/60 text-sm font-geist-mono mt-2 uppercase tracking-[0.2em] flex items-center gap-2">
             <span className="text-[#FF5F56] animate-pulse">■</span> [ // TOP_OPERATIVES_RANKED ]
           </p>
        </div>
        <div className="hidden md:flex text-right flex-col items-end">
           <span className="text-[10px] text-white/30 font-geist-mono tracking-widest uppercase">Encryption: AES-256</span>
           <span className="text-[10px] text-[#00E5B0] font-geist-mono tracking-widest uppercase animate-pulse">SYS.UPLINK: ACTIVE</span>
        </div>
      </div>

      <div className="w-full max-w-5xl stagger-2 animate-fade-in-up relative flex flex-col">
        {/* Massive Master Terminal Container */}
        <div className="bg-[#05070A] border border-[#00C2FF]/30 shadow-[0_0_30px_rgba(0,194,255,0.1)] relative flex flex-col w-full overflow-hidden">
           {/* Master Corner Brackets */}
           <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00C2FF] z-20 pointer-events-none" />
           <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00C2FF] z-20 pointer-events-none" />
           <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00C2FF] z-20 pointer-events-none" />
           <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00C2FF] z-20 pointer-events-none" />
           
           {/* Master Header */}
           <div className="px-5 py-3 border-b border-[#00C2FF]/20 flex items-center justify-between bg-[#0A0F14]/90 relative z-10 w-full">
             <span className="text-[10px] sm:text-[12px] font-geist-mono text-[#00C2FF] tracking-[0.2em] font-bold flex items-center gap-3">
               <span className="text-white animate-pulse">■</span> [ // GLOBAL_NEXUS_UPLINK ]
             </span>
             <span className="text-[8px] sm:text-[10px] font-geist-mono text-[#00C2FF]/40 tracking-wider hidden sm:block">LIVE_FEED: ACTIVE</span>
           </div>

           {/* Table Headers (Clean Data Alignment) */}
           <div className="px-5 py-3 border-b border-white/5 bg-[#05070A] flex items-center gap-4 sm:gap-6 text-[8px] sm:text-[10px] font-geist-mono text-white/40 uppercase tracking-[0.2em] font-bold">
              <div className="w-12 sm:w-20 text-center">Rank</div>
              <div className="flex-1 pl-2">Operative</div>
              <div className="w-20 sm:w-28 text-right">Rating</div>
              <div className="w-16 sm:w-24 text-right">Targets</div>
              <div className="hidden lg:block w-[130px] text-right">Clearance</div>
           </div>

           <div className="flex flex-col relative z-10 bg-[#05070A]">
             {/* Background Scanline */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(0,194,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,194,255,0.02)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none opacity-50" />

             {loading ? (
             <div className="w-full bg-[#05070A] border border-[#00C2FF]/20 p-8 flex items-center justify-center relative shadow-[0_0_30px_rgba(0,194,255,0.1)]">
                 <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#00C2FF]" />
                 <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#00C2FF]" />
                 <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#00C2FF]" />
                 <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#00C2FF]" />
                 <span className="text-[#00C2FF] font-geist-mono text-xs uppercase tracking-[0.2em] flex items-center gap-3">
                   <Shield className="w-4 h-4" /> Initializing Satellite Uplink <span className="w-2 h-4 bg-[#00C2FF] animate-pulse" />
                 </span>
             </div>
             ) : data.map((entry, idx) => (
                  <div 
                     key={entry.userId} 
                     className="px-5 py-4 border-b border-white/5 relative group flex items-center gap-4 sm:gap-6 hover:bg-[#0A0F14]/90 transition-colors"
                     style={{ animationDelay: `${(idx % 10 + 1) * 100}ms` }}
                  >
                     {/* Left Active Edge Indicator */}
                     <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${getRankAvatarStyle(entry.rank).split(' ')[0].replace('border-', 'bg-')} shadow-[0_0_10px_currentColor] scale-y-0 group-hover:scale-y-100 transition-transform origin-top z-20`} />
                   
                     {/* 1. Rank */}
                     <div className="flex items-center justify-center w-12 sm:w-20 relative z-10 shrink-0">
                       <div className={`text-2xl sm:text-4xl font-vt323 tracking-widest text-center ${getRankColor(entry.rank)}`}>
                          {entry.rank < 10 ? `0${entry.rank}` : entry.rank}
                       </div>
                     </div>
                   
                     {/* 2. Operative Avatar & Name */}
                     <div className="flex items-center gap-4 flex-1 relative z-10 w-full overflow-hidden pl-2">
                        <div className={`hidden sm:flex w-10 h-10 shrink-0 items-center justify-center border font-bold text-lg ${getRankAvatarStyle(entry.rank)} ${entry.rank === 1 ? 'animate-pulse' : ''}`}>
                           {entry.name?.[0]?.toUpperCase() || entry.email[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col truncate w-full">
                          <span className={`font-space-grotesk font-black text-[14px] sm:text-[18px] uppercase tracking-wider truncate transition-colors ${entry.rank <= 3 ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                            {entry.name || entry.email.split('@')[0]}
                          </span>
                          <span className="font-geist-mono text-[8px] sm:text-[9px] text-[#00C2FF]/30 tracking-[0.2em] uppercase mt-0.5 group-hover:text-[#00C2FF] transition-colors">
                            ID: {entry.userId.slice(0, 8)}
                          </span>
                        </div>
                     </div>
                   
                     {/* 3. Rating & Solved */}
                     <div className="w-20 sm:w-28 text-right relative z-10 shrink-0">
                        <span className={`text-xl sm:text-2xl font-vt323 tracking-widest ${entry.rank <= 3 ? getRankColor(entry.rank) : 'text-[#00E5B0] group-hover:drop-shadow-[0_0_10px_currentColor]'} transition-all`}>{entry.rating}</span>
                     </div>
                     <div className="w-16 sm:w-24 text-right relative z-10 shrink-0">
                        <span className="text-xl sm:text-2xl font-vt323 tracking-widest text-white/50 group-hover:text-white transition-colors">{entry.solved}</span>
                     </div>
                   
                     {/* 4. Designation Badges */}
                     <div className="hidden lg:flex w-[130px] justify-end relative z-10 shrink-0">
                        <div className="font-geist-mono text-[9px] font-bold uppercase tracking-[0.2em] flex items-center justify-end gap-1.5 text-right w-full">
                           {entry.rank <= 3 && <Sparkles size={10} className={`${getRankDesignation(entry.rank).color} animate-pulse`} />}
                           <span className={`${getRankDesignation(entry.rank).color}`}>[{getRankDesignation(entry.rank).label}]</span>
                        </div>
                     </div>
                  </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
