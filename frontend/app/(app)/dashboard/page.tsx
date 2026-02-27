"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listProblems, getMyStats, getMySubmissions, type Problem, type SubmissionHistoryItem } from "@/lib/api";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useTypewriter } from "@/hooks/use-typewriter";
import { useLiveSocket } from "@/hooks/useLiveSocket";

interface UserProfile {
  id: string;
  name?: string | null;
  username?: string;
  email?: string;
  role: string;
  rank?: number;
  rating?: number;
  xp?: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ totalSolved: number; totalSubmissions: number; accuracy: number; streak: number; byDifficulty: { EASY: number; MEDIUM: number; HARD: number }; recentActivity: SubmissionHistoryItem[] } | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionHistoryItem[]>([]);
  const [liveEvents, setLiveEvents] = useState<string[]>([]);
  const router = useRouter();

  // Parse User immediately from Cached session
  const user = session?.user as UserProfile | undefined;

  // Real-time socket connection
  const { listen } = useLiveSocket(user?.id ? [`user_${user.id}`] : []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [problemsRes, statsRes, subsRes] = await Promise.all([
        listProblems({ limit: 12 }),
        getMyStats(),
        getMySubmissions({ limit: 56 }),
      ]);
      setProblems(problemsRes.problems || []);
      setStats(statsRes);
      setSubmissions(subsRes.submissions || []);
    } catch (e) {
      console.warn("Dashboard fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const dynamicText = useTypewriter([
    "software engineers",
    "problem solvers",
    "systems thinkers",
    "AI-powered minds"
  ], 80, 40, 2000);

  const weaknessText = useTypewriter(
    ["Aivon recommends completing 3 Array problems before returning to DP."], 
    30, 0, 9999999
  );
  
  const systemLogText = useTypewriter(
    ["Engage targets immediately to restore."], 
    40, 1000, 3000
  );

  const [activityDots, setActivityDots] = useState<{r1: number, r2: number}[]>([]);
  useEffect(() => {
    // Build heatmap from real submission data
    if (submissions.length > 0) {
      const dots = Array.from({ length: 56 }).map((_, i) => {
        const hasSub = i < submissions.length;
        const isAccepted = hasSub && submissions[i]?.status === "ACCEPTED";
        return {
          r1: hasSub ? (isAccepted ? 0.9 : 0.7) : Math.random() * 0.4,
          r2: isAccepted ? 0.8 : Math.random(),
        };
      });
      setActivityDots(dots);
    } else {
      setActivityDots(Array.from({ length: 56 }).map(() => ({ r1: Math.random() * 0.3, r2: Math.random() })));
    }
  }, [submissions]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
      return;
    }
    if (status === "authenticated") {
      fetchDashboardData();
    }
  }, [status, router, fetchDashboardData]);

  // Real-time listener
  useEffect(() => {
    const unlisten = listen("stats_updated", (payload: any) => {
      // Re-fetch all data on stats change
      fetchDashboardData();
      // Add to live events feed
      const msg = payload?.status === "ACCEPTED" 
        ? `✓ Problem solved — Rating updated`
        : `✗ Submission processed`;
      setLiveEvents(prev => [msg, ...prev].slice(0, 10));
    });
    return unlisten;
  }, [listen, fetchDashboardData]);

  if (status === "loading" || loading || !user) {
    return (
      <div className="min-h-screen bg-[#05070A] flex items-center justify-center">
        <div className="text-[#00E5B0] font-geist-mono animate-pulse flex items-center gap-2">
          &gt; INITIATING COMMAND CENTER...<span className="inline-block w-[8px] h-[15px] bg-[#00E5B0] animate-[blink_1s_step-end_infinite]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white font-geist-sans relative overflow-x-hidden pt-[120px] pb-20 px-6 md:px-12">
      <main className="relative z-10 w-full max-w-[1500px] mx-auto">
        
        {/* 1. Hero / Welcome Strip */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:justify-between border-b border-white/10 pb-6 rounded-2xl bg-[#0A0F14]/40 p-6 lg:p-12"
        >
          {/* Left Summary */}
          <div className="flex flex-col w-full lg:w-[50%] lg:pr-8 justify-center items-start text-left">
            <div className="flex items-center gap-3 text-[10px] sm:text-[11px] text-[var(--text-muted)] font-geist-mono font-bold tracking-[0.2em] uppercase mb-4 text-[#00E5B0]">
              <div className="w-2 h-2 rounded-sm bg-[#00E5B0] animate-pulse shadow-[0_0_8px_#00E5B0]" />
              {stats && stats.totalSubmissions > 0 ? "SYS_AUTH: OPERATIVE ACTIVE" : "SYS_AUTH: NEW RECRUIT"}
            </div>
            
            {/* Hacker Font Welcome Message (VT323) */}
            <div className="relative">
              <h1 className="text-5xl md:text-[64px] lg:text-[76px] font-vt323 tracking-widest uppercase m-0 leading-[0.9] text-transparent bg-clip-text bg-[linear-gradient(180deg,#FFFFFF_0%,#A1A1AA_100%)] relative flex flex-col items-start gap-1">
                <span>{stats && stats.totalSubmissions > 0 ? "WELCOME BACK," : "WELCOME,"}</span>
                <span className="text-[#00E5B0] text-[0.8em] tracking-[0.15em] bg-clip-text text-transparent bg-[linear-gradient(90deg,#00E5B0_0%,#00C2FF_100%)] border-b-2 border-white/5 pb-1">
                  {user.name || user.username || "OPERATIVE"}
                  <span className="inline-block w-[0.4em] h-[0.8em] bg-[#00E5B0] ml-2 animate-pulse align-middle" />
                </span>
              </h1>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-5 mt-8 w-full max-w-xl mb-1 h-12">
              <div className="w-32 bg-[#05070A] border border-white/5 rounded-lg flex flex-col justify-center items-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-white/5 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#FACC15]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex flex-col items-center justify-center -space-y-0.5">
                  <span className="text-[9px] font-geist-mono text-[#FACC15]/60 uppercase tracking-[0.2em] z-10">Streak</span>
                  <span className="text-[14px] font-bold font-geist-mono text-[#FACC15] z-10 tracking-widest">{stats?.streak || 0} <span className="text-[12px]">DAYS</span></span>
                </div>
              </div>
              <Link href="/profile" className="flex-1 relative overflow-hidden group bg-transparent border border-white/5 text-[#00E5B0] font-space-grotesk font-bold uppercase tracking-[0.1em] transition-all duration-300 rounded-lg flex flex-col justify-center hover:bg-[#00E5B0]/10 hover:border-white/5 hover:text-white hover:shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00E5B0]/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <div className="flex items-center gap-3 px-6 z-10">
                  <span className="w-1.5 h-1.5 bg-[#00E5B0] rounded-full group-hover:animate-ping" />
                  <span className="text-[13px]">VIEW PROFILE</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Right Terminal ASCII */}
          <div className="relative w-full lg:w-[50%] flex-shrink-0 flex flex-col items-center justify-center mt-8 lg:mt-0 [perspective:1000px]">
             <motion.div 
               whileHover={{ 
                 scale: 1.02,
                 transition: { duration: 0.3, ease: "easeOut" }
               }}
               className="w-full max-w-[560px] mx-auto group/terminal"
             >
               <div className="border border-white/5 rounded-xl overflow-hidden shadow-lg relative bg-[#060D10]/80 w-full flex flex-col h-full min-h-[240px] transition-colors duration-500">
                 {/* Aivon Terminal Header (Matching Editor) */}
                 <div className="flex items-center justify-between h-14 px-4 border-b border-white/5 bg-[#0A0F14]/90 shrink-0 relative z-10">
                   <div className="flex items-center gap-3">
                     {/* Connection Status Dots */}
                     <div className="flex items-center gap-1.5 px-2 py-1 bg-black/50 rounded-sm border border-white/5">
                       <div className="w-1.5 h-1.5 rounded-sm bg-[#00E5B0] animate-pulse shadow-[0_0_5px_#00E5B0]" />
                       <div className="w-1.5 h-1.5 rounded-sm bg-white/20" />
                       <div className="w-1.5 h-1.5 rounded-sm bg-white/20" />
                     </div>
                   </div>
                   <span className="absolute left-1/2 -translate-x-1/2 text-[9px] font-geist-mono text-[#00E5B0]/50 tracking-[0.2em] uppercase">
                     terminal://aivon
                   </span>
                   <div className="flex gap-4">
                     <span className="text-[#00E5B0]/40 text-[10px] uppercase font-bold tracking-widest hidden sm:inline-block">SYS.RDY</span>
                   </div>
                 </div>
                 
                 {/* Terminal Body */}
                 <div className="p-8 lg:p-10 font-geist-mono text-[9px] sm:text-[11px] xl:text-[13px] text-[#00E5B0] leading-snug whitespace-pre overflow-x-auto relative flex flex-col items-center justify-center flex-grow">
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,229,176,0.05),transparent_70%)] pointer-events-none" />
                   <div className="flex flex-col justify-center w-full max-w-[320px] relative z-10">
  {`    ___    _____    __  __   ____    _   __ 
     /   |  /  _/  | / / / __ \\ / | / /
    / /| |  / /   \\ V / / / / //  |/ / 
   / ___ |_/ /     | | / /_/ // /|  /  
  /_/  |_/___/     |_| \\____//_/ |_/   `}
                     <div className="mt-8 text-[var(--text-secondary)] space-y-3 text-[11px] xl:text-[13px]">
                       <div className="flex gap-4 items-center group/line">
                         <span className="text-[#00E5B0] font-bold text-base group-hover/line:translate-x-1 transition-transform">❯</span>
                         <span className="text-white/40 font-bold min-w-[65px] text-[10px] tracking-widest uppercase">user:</span>
                         <span className="text-[#00E5B0] font-bold tracking-wider">{user.name || user.username || "operative"}</span>
                       </div>
                       <div className="flex gap-4 items-center group/line">
                         <span className="text-[#00C2FF] font-bold text-base group-hover/line:translate-x-1 transition-transform">❯</span>
                         <span className="text-white/40 font-bold min-w-[65px] text-[10px] tracking-widest uppercase">activity:</span>
                         <div className="flex items-center text-[#00C2FF]">
                           <span className="font-bold tracking-wider uppercase">{dynamicText}</span><span className="inline-block w-[8px] h-[15px] bg-[#00C2FF] ml-2 animate-[blink_1s_step-end_infinite]" />
                         </div>
                       </div>
                       <div className="flex gap-4 pt-1 items-center group/line">
                         <span className="text-[#FACC15] font-bold text-base group-hover/line:translate-x-1 transition-transform">❯</span>
                         <span className="text-white/40 font-bold min-w-[65px] text-[10px] tracking-widest uppercase">status:</span>
                         <span className="text-[#FACC15] font-black tracking-[0.2em] animate-pulse">OPTIMIZED</span>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             </motion.div>
          </div>
        </motion.header>
        {/* 2. Quick Action Bar (HIGH IMPACT) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
        >
          {[
            { tag: "[PRIORITY]", title: "Resume Target", desc: "Two Sum (Array)", color: "#FF5F56", link: "/problems/two-sum" },
            { tag: "[PATH]", title: "Learning Node", desc: "Binary Search Tree", color: "#00E5B0", link: "/problems" },
            { tag: "[ORACLE]", title: "Ask Aivon AI", desc: "Analyze weak spots", color: "#8A2BE2", link: "/chat" },
            { tag: "[COMBAT]", title: "Enter Arena", desc: "Enter the competitive battleground", color: "#00C2FF", link: "/arena" }
          ].map((action, i) => (
            <Link key={i} href={action.link} className="bg-[#05070A]/80 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all duration-300 hover:bg-[#0A0F14] hover:-translate-y-1 group relative overflow-hidden flex flex-col gap-2">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-current to-transparent opacity-10 rounded-bl-full pointer-events-none" style={{ color: action.color }} />
              <span className="text-[10px] font-geist-mono font-bold tracking-widest" style={{ color: action.color }}>{action.tag}</span>
              <span className="text-sm font-bold text-white uppercase tracking-wide">{action.title}</span>
              <span className="text-xs font-geist-mono text-[var(--text-muted)]">{action.desc}</span>
            </Link>
          ))}
        </motion.div>

        {/* Dashboard Grid Container */}
        <div className="bg-[#05070A]/80 border border-white/10 rounded-2xl p-6 lg:p-8 flex flex-col gap-6 shadow-2xl relative">
          {/* Subtle container glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none rounded-2xl" />

          {/* Upper Section (Full Width) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10 w-full mt-2">
            
            {/* Key Stats Row (Spans all 12 columns) */}
            <div className="col-span-1 lg:col-span-12">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                {[
                  { label: "RATING", value: user.rating || stats?.totalSolved ? (user.rating || 1200) : 1200, color: "text-[#00C2FF]" },
                  { label: "SOLVED", value: stats?.totalSolved ?? "—", color: "text-white" },
                  { label: "ACCURACY", value: stats ? `${stats.accuracy}%` : "—", color: "text-[#00E5B0]" },
                  { label: "STREAK", value: stats?.streak ?? "—", color: "text-[#FACC15]" },
                  { label: "RANK", value: user.rank || "—", color: "text-[#FF5F56]" },
                  { label: "SUBMISSIONS", value: stats?.totalSubmissions ?? "—", color: "text-[#8A2BE2]" }
                ].map((s, i) => (
                  <div key={i} className="bg-[#05070A]/80 border border-white/10 p-3 relative group overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.02)] flex flex-col justify-between hover:border-white/20 transition-colors">
                    {/* Structural Frame & Corners */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white/30 group-hover:border-white/60 transition-colors" />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white/30 group-hover:border-white/60 transition-colors" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white/30 group-hover:border-white/60 transition-colors" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white/30 group-hover:border-white/60 transition-colors" />

                    <div className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-geist-mono font-bold mb-2 transition-colors group-hover:text-white/60 flex items-center gap-2 truncate relative z-10">
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] text-white/50 transition-opacity">►</span>
                      {s.label}
                    </div>
                    <div className={`text-3xl lg:text-4xl font-vt323 tracking-widest ${s.color} drop-shadow-[0_0_10px_currentColor]/30 group-hover:drop-shadow-[0_0_15px_currentColor]/60 transition-all relative z-10`}>
                       {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Heatmap & Priority Side-by-Side (Spans all 12 columns) */}
            <div className="col-span-1 lg:col-span-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                
                {/* 5. Priority Target Panel (Creative GUI Redesign) */}
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: 0.15 }}
                   className="bg-[#05070A] p-6 relative flex flex-col justify-between border border-white/10 shadow-lg overflow-hidden group h-full"
                >
                   {/* Scanning Grid Background */}
                   <div className="absolute inset-0 bg-[linear-gradient(rgba(0,229,176,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,176,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-50" />
                   {/* Radar Sweep Animation */}
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(0,229,176,0.1)_90deg,transparent_90deg)] animate-[spin_4s_linear_infinite] pointer-events-none z-0 mix-blend-screen opacity-50" />
                   
                   {/* Target Crosshairs (Corners) */}
                   <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00E5B0]" />
                   <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00E5B0]" />
                   <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00E5B0]" />
                   <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00E5B0]" />

                   <div className="flex items-center justify-between bg-[#0A0F14]/90 px-4 py-2 border-b border-white/5 relative z-10 w-[calc(100%+3rem)] -ml-6 -mt-6 mb-6">
                     <span className="text-[10px] font-geist-mono text-[#00E5B0] tracking-[0.2em] font-bold flex items-center gap-2">
                       <span className="text-[#FF5F56] animate-pulse">■</span> [ // PRIORITY_OVERRIDE ]
                     </span>
                     <span className="text-[8px] font-geist-mono text-[#00E5B0]/40">TARGET.LOCK</span>
                   </div>

                   <div className="relative z-10">
                     <div className="flex items-start justify-between mb-4">
                       <div className="flex flex-col gap-1">
                          <h2 className="text-3xl font-black text-white uppercase tracking-tighter font-space-grotesk drop-shadow-md">
                            {problems[0]?.title || "No Target"}
                          </h2>
                       </div>
                       <div className="text-[10px] font-bold text-[#05070A] font-geist-mono tracking-widest bg-[#00E5B0] px-3 py-1 shadow-sm">
                         PRIORITY 1
                       </div>
                     </div>
                     
                     <div className="bg-[#0A0F14]/80 border border-white/5 p-4 mb-6 relative overflow-hidden">
                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FFBD2E]" />
                       <p className="text-[12px] md:text-[13px] font-medium text-[var(--text-secondary)] leading-relaxed font-geist-mono pl-2">
                          <span className="text-[#FFBD2E] mr-2">❯</span>
                          {stats && stats.accuracy < 50 
                            ? <>Low accuracy detected (<span className="text-white">{stats.accuracy}%</span>). Re-sync recommended to improve algorithm flow.</>
                            : <>Continue solving problems to build your proficiency. <span className="text-white">{stats?.totalSolved || 0}</span> problems solved so far.</>}
                        </p>
                     </div>
                   </div>
                   
                   <div className="flex items-center mt-auto relative z-10 w-full">
                      <Link href={`/problems/${problems[0]?.slug || "two-sum"}`} className="w-full relative overflow-hidden flex items-center justify-center gap-3 bg-[#060D10] border border-white/5 text-[#00E5B0] px-5 py-3 text-[12px] font-bold uppercase tracking-widest transition-all hover:bg-[#0A1418] hover:border-white/5 hover:text-white hover:shadow-sm group/btn">
                       {/* Gradient scanlight replicating View Profile button */}
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00E5B0]/15 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 z-0" />
                       <span className="relative z-10 flex items-center justify-center w-4 h-4 mr-1">
                         <span className="absolute inset-0 border border-current rounded-full" />
                         <span className="w-1.5 h-1.5 bg-current rounded-full group-hover/btn:animate-ping" />
                       </span>
                       <span className="relative z-10">ENGAGE TARGET</span>
                     </Link>
                   </div>
                </motion.div>

                 {/* 6. Neural Activity Sync - Sidebar (Now side-by-side with Priority) */}
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.98 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: 0.1 }}
                   className="bg-[#05070A] border border-white/5 shadow-sm h-full flex flex-col relative"
                 >
                   {/* Structural Frame & Corners */}
                   <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00C2FF]" />
                   <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00C2FF]" />
                   <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00C2FF]" />
                   <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00C2FF]" />

                   <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-[#0A0F14]/90 relative z-10 flex-shrink-0">
                     <span className="text-[10px] font-geist-mono text-[#00C2FF] font-bold tracking-[0.2em] flex items-center gap-2">
                       <span className="text-white animate-pulse">■</span> [ // NEURAL_HEATMAP_SYNC ]
                     </span>
                     <span className="text-[8px] font-geist-mono text-[#00C2FF]/40">SYS.ONLINE</span>
                   </div>
                   
                   <div className="p-5 flex flex-col gap-6 items-center justify-center flex-grow relative z-10">
                     <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1.5 w-full max-w-[400px]">
                       {activityDots.map((dot, i) => {
                         let dotColor = 'bg-[#111827] border border-white/5';
                         if (dot.r1 > 0.8) {
                           dotColor = dot.r2 > 0.5 ? 'bg-[#00E5B0] shadow-sm' : 'bg-[#27C93F] shadow-[0_0_10px_rgba(39,201,63,0.3)]';
                         } else if (dot.r1 > 0.6) {
                           dotColor = 'bg-[#00E5B0]/20 border border-white/5';
                         }
                         return (
                           <div key={i} className={`aspect-square rounded-[2px] ${dotColor} transition-colors duration-500`} />
                         );
                       })}
                     </div>
                     <div className="w-full text-center mt-auto border-t border-white/5 pt-4 text-[10px] font-geist-mono text-[#00C2FF]/60 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                       <span className="text-[#00C2FF]">❯</span> PRIMARY_INTENSITY_MATRIX
                     </div>
                   </div>
                 </motion.div>

              </div>
            </div>
          </div>

          {/* Matrix Progress - Terminal (Now Full Width Col-Span-12) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 w-full mt-2">
            <div className="col-span-1 lg:col-span-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[#05070A] border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col relative w-full"
              >
                {/* Structural Frame & Corners */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00C2FF]" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00C2FF]" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00C2FF]" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00C2FF]" />

                {/* Hardcore Terminal Header */}
                <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-[#0A0F14]/90 relative z-10 w-full mb-2">
                  <span className="text-[10px] font-geist-mono text-white/50 font-bold tracking-[0.2em] flex items-center gap-2">
                    <span className="text-[#00C2FF] animate-pulse">■</span> [ // MATRIX_PROGRESS ]
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-[8px] font-geist-mono text-[#00C2FF] animate-pulse hidden sm:inline tracking-wider">[LIVE_TRACING]</span>
                  </div>
                </div>
                
                <div className="p-5 sm:p-6 flex flex-col gap-6 relative overflow-hidden">
                   {/* CSS grid scanline overlay for hacker effect */}
                   <div className="absolute inset-0 bg-[linear-gradient(rgba(0,229,176,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,176,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
                   
                   <div className="relative z-10 flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                     {(() => {
                       const matrixCategories = stats ? [
                         { name: "Easy", pct: stats.byDifficulty.EASY > 0 ? Math.min(100, stats.byDifficulty.EASY * 10) : 0, total: stats.byDifficulty.EASY, color: "bg-[#00E5B0]" },
                         { name: "Medium", pct: stats.byDifficulty.MEDIUM > 0 ? Math.min(100, stats.byDifficulty.MEDIUM * 15) : 0, total: stats.byDifficulty.MEDIUM, color: "bg-[#FACC15]" },
                         { name: "Hard", pct: stats.byDifficulty.HARD > 0 ? Math.min(100, stats.byDifficulty.HARD * 20) : 0, total: stats.byDifficulty.HARD, color: "bg-[#FF5F56]" },
                         { name: "Overall Accuracy", pct: stats.accuracy, total: stats.totalSubmissions, color: "bg-[#00C2FF]" },
                       ] : [
                         { name: "Easy", pct: 0, total: 0, color: "bg-[#00E5B0]" },
                         { name: "Medium", pct: 0, total: 0, color: "bg-[#FACC15]" },
                         { name: "Hard", pct: 0, total: 0, color: "bg-[#FF5F56]" },
                         { name: "Overall Accuracy", pct: 0, total: 0, color: "bg-[#00C2FF]" },
                       ];
                       return matrixCategories;
                     })().map(cat => (
                       <div key={cat.name} className="flex flex-col gap-2 bg-[#0A0F14]/40 border border-white/5 p-3 rounded-none hover:border-white/5 transition-colors group/row">
                         <div className="flex justify-between items-center relative">
                           <div className="flex items-center gap-3">
                             <span className="text-[12px] font-bold text-white font-geist-mono uppercase tracking-wider">{cat.name}</span>
                           </div>
                            <div className="flex items-center gap-3 text-[10px] font-geist-mono relative">
                              <span className={`font-bold ${cat.color.replace('bg-', 'text-')}`}>{cat.pct}%</span>
                              <span className="text-white/30 font-bold">{cat.total} solved</span>
                            </div>
                         </div>
                         <div className="h-1.5 w-full bg-[#111827] rounded-full overflow-hidden border border-white/5">
                           <div className={`h-full ${cat.color} shadow-[0_0_10px_currentColor]`} style={{ width: `${cat.pct}%` }} />
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Lower Section (Grouped Logs) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 pt-2">
            {/* 8. Weakness Insights (Terminal) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-[#05070A] border border-white/5 shadow-[0_0_20px_rgba(255,95,86,0.15)] flex flex-col relative h-full w-full"
            >
              {/* Structural Frame & Corners */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#FF5F56]" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#FF5F56]" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#FF5F56]" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#FF5F56]" />

              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-[#0A0F14]/90 relative z-10 w-full">
                <span className="text-[10px] font-geist-mono text-[#FF5F56] font-bold tracking-[0.2em] flex items-center gap-2">
                  <span className="text-white animate-pulse">■</span> [ // DIAGNOSTICS_LOG ]
                </span>
                <span className="text-[8px] font-geist-mono text-[#FF5F56]/40 tracking-wider">[WARNING]</span>
              </div>
              <div className="p-5 text-[12px] font-geist-mono text-[var(--text-secondary)] leading-[1.8] flex-1">
                <div className="flex gap-3 mb-3">
                  <span className="text-[#FF5F56] font-bold mt-0.5">⚠</span>
                  <span><span className="text-white">Sliding Window</span> accuracy below threshold (32%).</span>
                </div>
                <div className="flex gap-3 mb-3">
                  <span className="text-[#FF5F56] font-bold mt-0.5">⚠</span>
                  <span><span className="text-white">Dynamic Programming</span> O(N^2) detected instead of optimal O(N).</span>
                </div>
                <div className="flex gap-3 mt-4 pt-4 border-t border-white/5 text-[11px]">
                  <span className="text-[#00E5B0] font-bold">❯</span>
                  <span>{weaknessText}</span>
                </div>
              </div>
            </motion.div>

            {/* Recent Activity / System Feed - Terminal */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#05070A] border border-white/5 shadow-lg flex flex-col relative h-full w-full"
            >
              {/* Structural Frame & Corners */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00E5B0]" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00E5B0]" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00E5B0]" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00E5B0]" />

              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-[#0A0F14]/90 relative z-10 w-full">
                <span className="text-[10px] font-geist-mono text-[#00E5B0] font-bold tracking-[0.2em] flex items-center gap-2">
                  <span className="text-white animate-pulse">■</span> [ // SYSTEM_FEED_TAIL ]
                </span>
              </div>
              <div className="p-5 text-[var(--text-secondary)] text-[12px] font-geist-mono leading-[2] flex-1">
                 {liveEvents.length > 0 ? (
                   liveEvents.map((evt, i) => (
                     <div key={i} className="flex gap-3 mb-2">
                       <span className={`font-bold ${evt.startsWith("✓") ? "text-[#27C93F]" : "text-[#FB923C]"}`}>❯</span>
                       <span className="text-white opacity-90">{evt}</span>
                     </div>
                   ))
                 ) : (
                   <>
                     <div className="flex gap-3 mb-2"><span className="text-[#27C93F] font-bold">❯</span> <span className="text-white opacity-90">Loading modules...</span></div>
                     <div className="flex gap-3 mb-2"><span className="text-[#FB923C] font-bold">❯</span> <span className="text-white opacity-90">Awaiting live events...</span></div>
                   </>
                 )}
                 <div className="flex gap-3"><span className="text-[#00C2FF] font-bold">❯</span> <span className="inline-block w-[8px] h-[15px] bg-[#00C2FF] mt-[5px] animate-[blink_1s_step-end_infinite]" /></div>
              </div>
            </motion.div>
          </div>

        </div>
      </main>
    </div>
  );
}
