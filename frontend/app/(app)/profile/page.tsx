"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { getMyStats, getSession, getMySubmissions, type SubmissionHistoryItem } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";
import { Lock, ShieldAlert, Cpu } from "lucide-react";
import { useLiveSocket } from "@/hooks/useLiveSocket";

/* ─── SVG Donut for Verdict Distribution ─── */
function VerdictDonut({ data }: { data: { label: string; count: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;

  const R = 45, CX = 60, CY = 60, C = 2 * Math.PI * R;
  const { slices } = data.filter(d => d.count > 0).reduce((acc, d) => {
    const fraction = d.count / total;
    const dash = fraction * C;
    const gap = C - dash;
    const rotate = (acc.currentOffset / total) * 360;
    
    acc.slices.push({ ...d, dash, gap, rotate });
    acc.currentOffset += d.count;
    
    return acc;
  }, { slices: [] as Array<typeof data[0] & { dash: number, gap: number, rotate: number }>, currentOffset: 0 });

  return (
    <div className="flex items-center gap-6 flex-wrap font-mono">
      <div className="relative group">
        {/* Sweeping Radar Background */}
        <div className="absolute inset-0 rounded-full [background:conic-gradient(from_0deg,transparent_0deg,rgba(0,229,176,0.2)_90deg,transparent_90deg)] animate-[spin_4s_linear_infinite] mix-blend-screen pointer-events-none" />
        
        <svg width={120} height={120} viewBox="0 0 120 120" className="drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          {/* Hardware Grid Rings */}
          <circle cx={CX} cy={CY} r={R + 10} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 4" />
          <circle cx={CX} cy={CY} r={R - 10} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          
          <g className="scale-y-[-1] translate-y-[-120px] origin-center rotate-[-90deg]">
            {slices.map((s, i) => (
              <circle key={i}
                cx={CX} cy={CY} r={R} fill="none"
                stroke={s.color} strokeWidth="12"
                strokeDasharray={`${s.dash} ${s.gap}`}
                strokeLinecap="butt"
                transform={`rotate(${-s.rotate} ${CX} ${CY})`}
                className="transition-all duration-1000 ease-out origin-center hover:stroke-[16px] cursor-crosshair"
              />
            ))}
          </g>

          {/* Digital Readout Center */}
          <text x={CX} y={CY + 2} textAnchor="middle" fill="#00E5B0" fontSize="22" fontWeight="800" fontFamily="inherit" className="drop-shadow-[0_0_8px_#00E5B0]">
            {total}
          </text>
          <text x={CX + 20} y={CY + 5} fill="#00E5B0" fontSize="16" className="animate-pulse">_</text>
          <text x={CX} y={CY + 18} textAnchor="middle" fill="white" fontSize="8" fontFamily="inherit" letterSpacing="0.2em" opacity="0.5">
            TOTAL_OP
          </text>
        </svg>
      </div>

      <div className="flex flex-col gap-2">
        {data.filter(d => d.count > 0).map((d) => (
          <div key={d.label} className="flex items-center gap-3 text-[10px] group hover:bg-white/5 px-2 py-1 transition-colors">
            <span className="text-[#00C2FF] opacity-30 group-hover:opacity-100 group-hover:animate-pulse">]</span>
            <div className="w-1.5 h-1.5 rounded-sm shadow-[0_0_5px_currentColor]" style={{ background: d.color, color: d.color }} />
            <span className="text-white/60 flex-1 uppercase tracking-widest font-geist-mono transition-colors group-hover:text-white">{d.label}</span>
            <span className="font-bold text-xs" style={{ color: d.color }}>{d.count}</span>
            <span className="text-white/30 min-w-[32px] text-right">
              {Math.round((d.count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Runtime Trend Line Chart ─── */
function RuntimeTrend({ points }: { points: { runtime: number; label: string }[] }) {
  if (points.length < 2) return (
    <div className="text-[#FF5500]/50 text-xs text-center p-6 font-geist-mono uppercase tracking-widest border border-dashed border-[#FF5500]/20 bg-[#0A0F14]/30">
      <span className="animate-pulse">_</span> Insufficient telemetry. Execute more operative missions.
    </div>
  );

  const W = 320, H = 80;
  const maxR = Math.max(...points.map(p => p.runtime), 1);
  const minR = Math.min(...points.map(p => p.runtime));
  const range = maxR - minR || 1;

  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * (W - 20) + 10,
    y: H - 10 - ((p.runtime - minR) / range) * (H - 20),
  }));
  const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");

  return (
    <div className="font-geist-mono w-full relative group">
      {/* Sweeping Scanner Line */}
      <div className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_white] opacity-50 block transform transition-all pointer-events-none z-20 animate-[scan_4s_linear_infinite]" style={{ left: '0%' }} />

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
        {/* Oscilloscope Grid */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          </pattern>
          <linearGradient id="rtGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />

        {/* Data Path */}
        <path d={`${pathD} L ${coords.at(-1)!.x} ${H} L ${coords[0].x} ${H} Z`} fill="url(#rtGrad)" className="animate-fade-in-up" />
        <path d={pathD} fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
        
        {/* Hardware Crosshairs */}
        {coords.map((c, i) => (
          <g key={i} className="hover:scale-150 transition-transform origin-center cursor-crosshair group/point">
            <path d={`M ${c.x - 3} ${c.y} L ${c.x + 3} ${c.y} M ${c.x} ${c.y - 3} L ${c.x} ${c.y + 3}`} stroke="#FFFFFF" strokeWidth="1" />
            <circle cx={c.x} cy={c.y} r="1.5" fill="#FFFFFF" className="group-hover/point:fill-[#00E5B0]" />
            <text x={c.x} y={c.y - 8} fontSize="5" fill="#FFFFFF" textAnchor="middle" className="opacity-0 group-hover/point:opacity-100 transition-opacity drop-shadow-md">
              {points[i].runtime}ms
            </text>
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[8px] text-white/40 mt-3 uppercase tracking-[0.2em]">
        {points.map((p, i) => <span key={i} className="relative before:absolute before:-top-3 before:left-1/2 before:-translate-x-1/2 before:h-2 before:w-[1px] before:bg-white/10">{p.label}</span>)}
      </div>
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  ACCEPTED: "var(--accent-green)", WRONG_ANSWER: "var(--accent-red)", WRONG_ANSWER_ON_HIDDEN_TEST: "#f43f5e",
  TIME_LIMIT_EXCEEDED: "var(--accent-yellow)", RUNTIME_ERROR: "#f97316",
  COMPILATION_ERROR: "var(--accent-red)", INTERNAL_ERROR: "#6b7280",
  MEMORY_LIMIT_EXCEEDED: "var(--accent-yellow)",
};

const formatStatus = (s: string) => {
  const map: Record<string, string> = {
    ACCEPTED: "Accepted", WRONG_ANSWER: "Wrong Answer", WRONG_ANSWER_ON_HIDDEN_TEST: "Hidden Test Failed",
    TIME_LIMIT_EXCEEDED: "TLE", RUNTIME_ERROR: "Runtime Error",
    COMPILATION_ERROR: "Compile Error",
  };
  return map[s] ?? s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [hexTime, setHexTime] = useState("00000000");
  const [randHex1, setRandHex1] = useState("0000");
  const [randHex2, setRandHex2] = useState("0");
  const [stats, setStats] = useState<{
    totalSolved: number; totalSubmissions: number; accuracy: number; streak: number;
    byDifficulty: { EASY: number; MEDIUM: number; HARD: number };
    recentActivity: SubmissionHistoryItem[];
  } | null>(null);
  const [user, setUser] = useState<{ id?: string, name: string | null; email: string; rating: number; createdAt: string } | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const router = useRouter();

  const { listen } = useLiveSocket(user?.id ? [`user_${user.id}`] : []);

  useEffect(() => {
    const unlisten = listen("stats_updated", () => {
      // Re-fetch when stats change via another window submission
      getMyStats().then(setStats).catch(() => {});
      getMySubmissions({ limit: 20 }).then(d => setSubmissions(d.submissions)).catch(() => {});
    });
    return unlisten;
  }, [listen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      setHexTime(Date.now().toString(16).toUpperCase());
      setRandHex1((Math.floor(Math.random() * 9000) + 1000).toString());
      setRandHex2(Math.floor(Math.random() * 9).toString());
    }, 0);
    
    Promise.all([getMyStats(), getSession()])
      .then(([s, sess]) => { 
        if (!sess || !sess.user) {
          router.push("/sign-in");
          return;
        }
        setStats(s); setUser(sess.user); 
      })
      .catch((err) => {
        console.warn("Profile fetch failed:", err.message);
        router.push("/sign-in");
      });
      
    getMySubmissions({ limit: 20 })
      .then(d => setSubmissions(d.submissions))
      .catch(() => {}); // graceful

    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (isHistoryOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    }
  }, [isHistoryOpen]);



  // Compute verdict distribution from recent submissions
  const verdictGroups = submissions.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  const verdictData = [
    { label: "Accepted",    count: verdictGroups["ACCEPTED"] ?? 0,              color: "var(--accent-green)" },
    { label: "Wrong Answer",count: verdictGroups["WRONG_ANSWER"] ?? 0,          color: "var(--accent-red)" },
    { label: "Hidden Test Failed",count: verdictGroups["WRONG_ANSWER_ON_HIDDEN_TEST"] ?? 0, color: "#f43f5e" },
    { label: "TLE",         count: verdictGroups["TIME_LIMIT_EXCEEDED"] ?? 0,   color: "var(--accent-yellow)" },
    { label: "Runtime Err", count: verdictGroups["RUNTIME_ERROR"] ?? 0,         color: "#f97316" },
    { label: "Compile Err", count: verdictGroups["COMPILATION_ERROR"] ?? 0,     color: "var(--accent-cyan)" },
  ];

  // Runtime trend from last accepted submissions with runtimes
  const runtimePoints = submissions
    .filter(s => s.status === "ACCEPTED" && s.runtime != null)
    .slice(0, 10)
    .reverse()
    .map(s => ({
      runtime: s.runtime!,
      label: new Date(s.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    }));

  // Avg runtime (accepted only)
  const acceptedWithRuntime = submissions.filter(s => s.status === "ACCEPTED" && s.runtime != null);
  const avgRuntime = acceptedWithRuntime.length
    ? Math.round(acceptedWithRuntime.reduce((s, r) => s + r.runtime!, 0) / acceptedWithRuntime.length)
    : null;

  // Language distribution
  const langGroups = submissions.reduce<Record<string, number>>((acc, s) => {
    acc[s.language] = (acc[s.language] ?? 0) + 1;
    return acc;
  }, {});
  const topLang = Object.entries(langGroups).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="min-h-screen pt-[120px] pb-20 w-full px-6 md:px-12 font-space-grotesk bg-transparent">
      <div className="relative z-10 w-full max-w-[1500px] mx-auto">

      {/* ── User Header (Operative Dossier) ── */}
      {user && (
        <div className="bg-[#05070A]/80 border-[0.5px] border-white/5 rounded-xl overflow-hidden shadow-hacker-glow backdrop-blur-lg mb-12 relative flex flex-col stagger-1 animate-fade-in-up">
          {/* Top Tech Bar */}
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-[#0A0F14] relative z-10 w-full">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#00E5B0] animate-pulse shadow-[0_0_8px_#00E5B0]" />
              <span className="text-[10px] font-geist-mono text-[#00E5B0] tracking-widest uppercase">
                SYS_AUTH: {stats && stats.totalSubmissions > 0 ? "VETERAN OPERATIVE" : "ROOKIE OPERATIVE"}
              </span>
            </div>
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF5F56]/80" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#FFBD2E]/80" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#27C93F]/80" />
            </div>
          </div>
          
          <div className="p-8 md:p-10 relative z-10 flex flex-col md:flex-row items-center md:items-center gap-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(0,229,176,0.05)_90deg,transparent_90deg)] animate-[spin_10s_linear_infinite] pointer-events-none mix-blend-screen opacity-50 block" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,229,176,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,176,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

            {/* Faceted Crosshair Avatar Block */}
            <div className="relative group shrink-0">
              {/* Targetting crosshairs */}
              <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-[#00C2FF] transition-all duration-300 group-hover:w-full group-hover:h-full group-hover:-top-1 group-hover:-left-1 group-hover:border-[#00E5B0] group-hover:opacity-50 z-20 pointer-events-none" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-[#00C2FF] transition-all duration-300 group-hover:w-full group-hover:h-full group-hover:-bottom-1 group-hover:-right-1 group-hover:border-[#00E5B0] group-hover:opacity-50 z-20 pointer-events-none" />
              
              <div className="w-28 h-28 bg-[#060D10] flex items-center justify-center text-[#00E5B0] shadow-sm overflow-hidden border border-white/5 relative z-10 [clip-path:polygon(15%_0%,_85%_0%,_100%_15%,_100%_85%,_85%_100%,_15%_100%,_0%_85%,_0%_15%)]">
                {/* Scanner line overlay */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-[#00E5B0]/50 shadow-[0_0_10px_#00E5B0] opacity-50 block -translate-y-full hover:animate-[scan_2s_linear_infinite] z-30" />
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,229,176,0.05)_2px,rgba(0,229,176,0.05)_4px)] mix-blend-screen pointer-events-none z-30" />
                
                {/* Hacker SVG Graphic */}
                <svg viewBox="0 0 100 100" className="w-full h-[120%] scale-[1.1] translate-y-5 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:scale-[1.15] transition-transform duration-500 relative z-10" xmlns="http://www.w3.org/2000/svg">
                  {/* Hoodie Outer */}
                  <path d="M 5 100 C 5 65, 20 45, 50 10 C 80 45, 95 65, 95 100 Z" fill="#28597A" stroke="black" strokeWidth="4.5" strokeLinejoin="round"/>
                  
                  {/* Sleeves */}
                  <path d="M 5 85 C 0 95, 10 100, 20 100 L 25 100 C 20 90, 20 85, 5 85 Z" fill="#28597A" stroke="black" strokeWidth="4.5" strokeLinejoin="round"/>
                  <path d="M 95 85 C 100 95, 90 100, 80 100 L 75 100 C 80 90, 80 85, 95 85 Z" fill="#28597A" stroke="black" strokeWidth="4.5" strokeLinejoin="round"/>

                  {/* Hood Inner Shadow / Rim */}
                  <path d="M 22 55 C 15 40, 30 18, 50 18 C 70 18, 85 40, 78 55 C 80 70, 70 80, 50 80 C 30 80, 20 70, 22 55 Z" fill="black"/>

                  {/* Neck Shadow */}
                  <path d="M 40 60 L 60 60 C 60 72, 40 72, 40 60 Z" fill="#D2A072"/>
                  {/* Lower Face */}
                  <path d="M 28 40 C 28 65, 42 68, 50 68 C 58 68, 72 65, 72 40 Z" fill="#F1C28F"/>
                  
                  {/* Ears */}
                  <circle cx="27" cy="40" r="4" fill="#F1C28F" stroke="black" strokeWidth="2.5"/>
                  <circle cx="73" cy="40" r="4" fill="#F1C28F" stroke="black" strokeWidth="2.5"/>

                  {/* Upper Face / Void behind glasses */}
                  <path d="M 28 40 C 30 25, 40 22, 50 22 C 60 22, 70 25, 72 40 Z" fill="black"/>

                  {/* Sunglasses */}
                  {/* Left Lens */}
                  <rect x="29" y="34" width="18" height="9" rx="2" fill="#4B4B4B" stroke="black" strokeWidth="3"/>
                  <path d="M 32 36 L 44 36 L 44 38 L 32 38 Z" fill="#757575"/>
                  
                  {/* Right Lens */}
                  <rect x="53" y="34" width="18" height="9" rx="2" fill="#4B4B4B" stroke="black" strokeWidth="3"/>
                  <path d="M 56 36 L 68 36 L 68 38 L 56 38 Z" fill="#757575"/>

                  {/* Bridge */}
                  <rect x="47" y="37" width="6" height="3" fill="black"/>

                  {/* Laptop */}
                  <path d="M 15 65 L 85 65 L 88 100 L 12 100 Z" fill="black" stroke="black" strokeWidth="4.5" strokeLinejoin="round"/>
                  <path d="M 17 67 L 83 67 L 86 100 L 14 100 Z" fill="#C9C9C9" />
                  
                  {/* Laptop Screen Split/Shading */}
                  <path d="M 68 67 L 83 67 L 86 100 L 71 100 Z" fill="#A3A3A3" />
                  
                  {/* Laptop Base Lip */}
                  <rect x="12" y="96" width="76" height="4" fill="#A3A3A3" className="opacity-50"/>
                  
                  {/* Light Apple/Circle Logo */}
                  <circle cx="50" cy="80" r="6" fill="#F0F0F0" stroke="black" strokeWidth="2.5" className="animate-pulse drop-shadow-[0_0_5px_white] group-hover:fill-white group-hover:scale-110 transition-transform"/>
                </svg>
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left relative z-10 flex flex-col justify-center">
              {/* Faux Metadata Above Name */}
              <div className="text-[#00C2FF] text-[9px] font-geist-mono uppercase tracking-[0.3em] mb-2 flex items-center justify-center md:justify-start gap-4 opacity-70">
                <span><span className="text-white/30 mr-1 text-[8px]">ID:</span>Aivon-{mounted ? randHex1 : "0000"}</span>
                <span className="hidden md:inline text-white/10">|</span>
                <span className="hidden md:inline"><span className="text-white/30 mr-1 text-[8px]">SYS_LATENCY:</span>14MS</span>
                <span className="hidden md:inline text-white/10">|</span>
                <span className="hidden sm:flex items-center gap-1">
                  <span className="w-1 h-3 bg-[#00E5B0] animate-pulse" />
                  <span className="w-1 h-3 bg-[#00E5B0]/40 animate-pulse delay-75" />
                  <span className="w-1 h-3 bg-[#00E5B0]/10 animate-pulse delay-150" />
                </span>
              </div>

              {/* Glitch Typography Name */}
              <div className="relative group inline-block">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-vt323 uppercase tracking-widest mb-1 text-transparent bg-clip-text bg-[linear-gradient(180deg,#FFFFFF_0%,#A1A1AA_100%)] drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] relative z-10 group-hover:text-white transition-colors">
                  <span className="text-[#00C2FF] mr-2 opacity-50 group-hover:opacity-100 transition-opacity">]</span>
                  {user.name || user.email.split("@")[0]}
                </h1>
                {/* Glitch Pseudo-elements on hovering container */}
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-vt323 uppercase tracking-widest mb-1 text-[#00E5B0] absolute top-0 left-[-2px] opacity-0 group-hover:opacity-70 group-hover:animate-[glitch_0.3s_linear_infinite] mix-blend-screen pointer-events-none select-none z-0">
                  <span className="text-transparent mr-2">]</span>
                  {user.name || user.email.split("@")[0]}
                </h1>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-vt323 uppercase tracking-widest mb-1 text-[#FF1493] absolute top-[2px] left-[2px] opacity-0 group-hover:opacity-70 group-hover:animate-[glitch_0.4s_linear_infinite_reverse] mix-blend-screen pointer-events-none select-none z-0">
                  <span className="text-transparent mr-2">]</span>
                  {user.name || user.email.split("@")[0]}
                </h1>
              </div>

              {/* Terminal Logging Subtext */}
              <p className="text-[#00E5B0] text-xs font-geist-mono tracking-[0.2em] flex flex-col md:flex-row items-center gap-3 mt-2">
                <span className="lowercase bg-[#00E5B0]/10 border border-white/5 px-2 py-0.5 rounded-sm">{user.email}</span> 
                <span className="hidden md:inline text-white/20">/</span> 
                <span className="flex items-center gap-2 text-white/60 uppercase">
                  <span className="w-2 h-2 rounded-full bg-[#00E5B0] shadow-[0_0_8px_#00E5B0] animate-pulse" />
                  AUTH_START: {new Date(user.createdAt).toLocaleDateString()}
                </span>
                <span className="hidden md:inline text-[#00C2FF]/30 text-[10px] ml-auto">0x{mounted ? hexTime : "00000000"}</span>
              </p>
            </div>
            
            {/* Active Processing Node (Neural Rating) */}
            <div className="text-center md:text-right shrink-0 relative z-10 bg-[#0A0F14]/80 border border-white/5 p-5 rounded-none shadow-[inset_0_0_20px_rgba(250,204,21,0.05)] min-w-[160px] group overflow-hidden">
              {/* Corner Brackets */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white/5 group-hover:border-[#FACC15] transition-colors" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white/5 group-hover:border-[#FACC15] transition-colors" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white/5 group-hover:border-[#FACC15] transition-colors" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white/5 group-hover:border-[#FACC15] transition-colors" />

              {/* Scanning background line */}
              <div className="absolute -left-full top-1/2 w-[200%] h-[1px] bg-[#FACC15]/20 -rotate-45 block transform -translate-y-1/2 group-hover:animate-[scan_3s_linear_infinite]" />

              <div className="text-[9px] font-bold text-[#FACC15]/70 font-geist-mono tracking-[0.2em] uppercase mb-1 flex items-center justify-center md:justify-end gap-2 relative z-10">
                <span className="w-1.5 h-1.5 bg-[#FACC15] animate-pulse" />
                NEURAL RATING
              </div>
              
              <div className="relative flex items-center justify-center md:justify-end mt-2 mb-1">
                {/* Decorative spinning ring */}
                <div className="absolute w-14 h-14 border border-dashed border-white/5 rounded-full animate-[spin_15s_linear_infinite]" />
                <div className="absolute w-10 h-10 border border-white/5 rounded-full animate-[spin_10s_linear_infinite_reverse]" />
                
                <div className="text-5xl font-vt323 text-[#FACC15] drop-shadow-[0_0_15px_rgba(250,204,21,0.4)] relative z-10 group-hover:text-white transition-colors duration-300">
                  {user.rating}
                </div>
              </div>
              
              {/* Hex Data Stream */}
              <div className="bg-[#05070A] px-2 py-0.5 mt-3 border border-white/5 text-[8px] font-geist-mono text-[#FACC15]/50 flex justify-between items-center relative z-10 overflow-hidden group-hover:text-[#FACC15]/80 transition-colors">
                <span>0xAF{mounted ? randHex2 : "0"}9</span>
                <span className="group-hover:animate-pulse">PRC_RUN</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {stats && (
        <>
          {/* ── Key Stats HUD Array ── */}
          <div className="w-full mb-12 stagger-2 animate-fade-in-up">
            <div className="bg-[#05070A]/80 border border-white/10 p-1 relative group overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.02)]">
              {/* Structural Frame & Corners */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/30 group-hover:border-white/60 transition-colors" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/30 group-hover:border-white/60 transition-colors" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/30 group-hover:border-white/60 transition-colors" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/30 group-hover:border-white/60 transition-colors" />

              {/* Faux HUD Header */}
              <div className="absolute top-1 left-4 flex gap-4 text-[7px] font-geist-mono text-white/30 tracking-[0.2em] font-bold">
                <span className="flex items-center gap-1"><span className="w-1 h-1 bg-[#00E5B0] animate-pulse rounded-full" /> DATA_LINK: STABLE</span>
                <span className="flex items-center gap-1"><span className="w-1 h-1 bg-[#00C2FF] animate-pulse rounded-full delay-75" /> UPTIME: OK</span>
                <span className="hidden md:flex items-center gap-1"><span className="w-1 h-1 bg-[#FF5500] animate-pulse rounded-full" /> V: 2.1.04</span>
              </div>

              {/* Seamless Array Container */}
              <div className="flex flex-col md:flex-row items-center justify-between pt-6 pb-2 px-6 relative z-10 w-full">
                {[
                  { label: "SOLVED_COUNT",    value: stats.totalSolved,          color: "text-[#00C2FF]" },
                  { label: "TOTAL_HITS",      value: stats.totalSubmissions,     color: "text-white" },
                  { label: "ACCURACY_RTE",    value: `${stats.accuracy}%`,       color: "text-[#00E5B0]" },
                  ...(avgRuntime != null ? [{ label: "RUNTIME_AVG",   value: `${avgRuntime}ms`,   color: "text-[#FF5500]" }] : []),
                  ...(topLang && avgRuntime == null ? [{ label: "PRI_LANGUAGE",  value: topLang[0].charAt(0).toUpperCase() + topLang[0].slice(1), color: "text-[#FF1493]" }] : []),
                ].map((s, idx, arr) => (
                  <div key={idx} className="flex items-center w-full md:w-auto h-full group/metric relative py-4 md:py-0">
                    <div className="flex flex-col items-center md:items-start flex-1 md:flex-none px-4">
                      <div className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-geist-mono font-bold mb-1 transition-colors group-hover/metric:text-white/60 flex items-center gap-2">
                        <span className="opacity-0 group-hover/metric:opacity-100 text-[10px] text-white/50 transition-opacity">►</span>
                        {s.label}
                      </div>
                      <div className={`text-4xl md:text-5xl font-vt323 tracking-widest ${s.color} drop-shadow-[0_0_10px_currentColor]/30 group-hover/metric:drop-shadow-[0_0_15px_currentColor]/60 transition-all`}>
                        {s.value}
                      </div>
                    </div>

                    {/* Array Separators (Slashes between metrics, hidden on mobile/last item) */}
                    {idx < arr.length - 1 && (
                      <div className="hidden md:flex self-stretch items-center justify-center px-4 md:px-6 relative">
                        <div className="text-white/10 font-geist-mono text-4xl font-light italic select-none transform skew-x-12">
                          /
                        </div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white/20 rounded-full shadow-[0_0_10px_white]/20" />
                      </div>
                    )}
                    
                    {/* Mobile Separator (Horizontal line) */}
                    {idx < arr.length - 1 && (
                      <div className="md:hidden absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-white/5" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Analytics Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12 stagger-3 animate-fade-in-up">

            {/* Verdict Donut (Hacker Frame) */}
            <div className="bg-[#05070A] border border-white/5 overflow-hidden shadow-sm flex flex-col h-full relative group">
              {/* Terminal Frame Brackets ([ ┐ ) */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00E5B0]" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00E5B0]" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00E5B0]" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00E5B0]" />

              {/* Hardcore Header */}
              <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between bg-[#0A0F14]/80 relative z-10 w-full mb-2">
                <span className="text-[10px] font-geist-mono text-[#00E5B0] tracking-[0.2em] font-bold flex items-center gap-2">
                  <span className="text-[#00C2FF] animate-pulse">■</span> [ // VERDICT_DATA_STREAM ]
                </span>
                <span className="text-[8px] font-geist-mono text-[#00E5B0]/40">SYS.OK</span>
              </div>
              
              <div className="p-6 relative flex-grow flex flex-col">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,229,176,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,176,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
                <h2 className="text-xs font-bold text-[#00E5B0]/50 uppercase tracking-widest mb-6 flex items-center gap-3 relative z-10">
                  <ShieldAlert size={14} className="text-[#00E5B0]" /> Submission Verdicts
                </h2>
                <div className="relative z-10 flex-grow flex items-center justify-center mt-4">
                  {submissions.length > 0 ? (
                    <VerdictDonut data={verdictData} />
                  ) : (
                    <div className="text-[#00E5B0]/50 text-xs text-center py-10 font-geist-mono uppercase tracking-widest border border-dashed border-white/5 p-4 w-full block">No neural links established yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Runtime Trend (Hacker Frame) */}
            <div className="bg-[#05070A] border border-white/30 overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.1)] flex flex-col h-full relative group">
              {/* Terminal Frame Brackets */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white" />

              {/* Hardcore Header */}
              <div className="px-4 py-2 border-b border-white/20 flex items-center justify-between bg-[#0A0F14]/80 relative z-10 w-full mb-2">
                <span className="text-[10px] font-geist-mono text-white tracking-[0.2em] font-bold flex items-center gap-2">
                  <span className="text-white animate-pulse">■</span> [ // RUNTIME_TRACE ]
                </span>
                <span className="text-[8px] font-geist-mono text-white/40">SYNC_MS</span>
              </div>
              
              <div className="p-6 relative flex-grow flex flex-col">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
                <h2 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-6 flex items-center gap-3 relative z-10">
                  <ShieldAlert size={14} className="text-white" /> Runtime Trend
                </h2>
                <div className="relative z-10 flex-grow flex items-center justify-center mt-4">
                  <RuntimeTrend points={runtimePoints} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Difficulty Breakdown (Target Matrix - Server Rack) ── */}
          <div className="bg-[#05070A] border border-white/5 overflow-hidden shadow-sm mb-12 relative flex flex-col stagger-4 animate-fade-in-up">
            {/* Terminal Frame Brackets */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00E5B0]" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00E5B0]" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00E5B0]" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00E5B0]" />

            {/* Hardcore Tech Header */}
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-[#0A0F14]/90 relative z-10 w-full">
              <div className="flex items-center gap-3">
                <span className="text-[#00C2FF] animate-pulse">■</span>
                <span className="text-[10px] font-geist-mono text-[#00E5B0] font-bold tracking-[0.2em] uppercase">
                  [ // TARGET_MATRIX_DIAGNOSTICS ]
                </span>
              </div>
              <span className="text-[8px] font-geist-mono text-[#00E5B0]/30 hidden sm:inline">ARRAY_READOUT: ACTIVE</span>
            </div>

            <div className="p-8 relative">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,229,176,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,176,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
              
              {/* Vertical Server-Rack Stack */}
              <div className="flex flex-col gap-6 relative z-10">
                {Object.entries(stats.byDifficulty).map(([diff, count], idx) => {
                  const total = Object.values(stats.byDifficulty).reduce((a, b) => a + b, 0);
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  const colorOverride: Record<string, string> = { EASY: "#00E5B0", MEDIUM: "#FACC15", HARD: "#FF5F56" };
                  const barColor = colorOverride[diff] || "#00E5B0";
                  
                  return (
                    <div key={diff} className="w-full flex flex-col md:flex-row items-start md:items-center gap-4 group server-rack-row">
                      {/* Readout Left: Count and Label */}
                      <div className="flex items-center gap-4 min-w-[200px] bg-[#0A0F14]/80 border border-white/5 px-4 py-2 relative overflow-hidden group-hover:border-white/20 transition-colors">
                        <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: barColor }} />
                        <div className="text-4xl font-vt323 tracking-widest drop-shadow-[0_0_15px_currentColor] min-w-[50px]" style={{ color: barColor }}>{count}</div>
                        <div className="flex flex-col">
                          <div className="text-[10px] font-bold font-geist-mono uppercase tracking-[0.2em]" style={{ color: barColor }}>{diff}</div>
                          <div className="text-[8px] font-geist-mono text-white/30 uppercase tracking-widest">THREAT_LEVEL: {idx + 1}</div>
                        </div>
                      </div>

                      {/* Readout Right: Structural Tracker */}
                      <div className="flex-1 w-full flex items-center gap-3">
                        <div className="text-[10px] font-geist-mono font-bold w-8 text-right group-hover:animate-pulse" style={{ color: barColor }}>{pct}%</div>
                        
                        <div className="h-1 flex-1 bg-[#111827] relative overflow-hidden flex shadow-[inset_0_0_5px_black]">
                          {/* Continuous line background */}
                          <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(255,255,255,0.05)_2px,rgba(255,255,255,0.05)_4px)]" />
                          
                          {/* Colored Progress Fill */}
                          <div className="h-full relative transition-all duration-1000 ease-out z-10" style={{ width: `${pct}%`, background: barColor, boxShadow: `0 0 10px ${barColor}` }}>
                            {/* Head tracer dot */}
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ boxShadow: `0 0 8px ${barColor}` }} />
                          </div>
                        </div>
                        
                        <div className="text-[8px] font-geist-mono text-white/20 uppercase hidden lg:block tracking-widest">SEC_OK</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Recent Submissions (System Log) ── */}
          <div className="bg-[#05070A] border border-white/5 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col relative stagger-5 animate-fade-in-up">
             {/* Terminal Frame Brackets */}
             <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/20" />
             <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/20" />
             <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/20" />
             <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/20" />

            {/* Hardcore Header */}
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-[#0A0F14]/90 relative z-10 w-full mb-2">
              <span className="text-[10px] font-geist-mono text-white/50 font-bold tracking-[0.2em] flex items-center gap-2">
                <span className="text-[#00C2FF] animate-pulse">■</span> [ // ACTIVITY_LOG ]
              </span>
              <div className="flex items-center gap-4">
                <span className="text-[8px] font-geist-mono text-white/30 hidden sm:inline">REC_TRACE: ACTIVE</span>
                <button 
                  onClick={() => setIsHistoryOpen(true)}
                  className="px-3 py-1.5 border border-white/5 bg-[#00C2FF]/5 hover:bg-[#00C2FF]/15 text-[9px] font-geist-mono text-[#00C2FF] transition-all tracking-[0.2em] uppercase flex items-center gap-2 group/btn relative overflow-hidden backdrop-blur-sm"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-[#00C2FF]/20 to-transparent -translate-x-[150%] group-hover/btn:translate-x-[150%] transition-transform duration-500 ease-in-out" />
                  HISTORY <span className="text-[10px] opacity-70 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all">↗</span>
                </button>
              </div>
            </div>
            
            <div className="relative w-full px-5 pb-5">
              <div className="flex flex-col gap-[2px] font-geist-mono text-[11px] uppercase tracking-wider relative z-10">
                {(() => {
                  const sourceArray = submissions.length > 0 ? submissions : (stats?.recentActivity || []);
                  const uniqueSubmissions: SubmissionHistoryItem[] = [];
                  const seenProblems = new Set();
                  
                  for (const s of sourceArray) {
                    const id = s.problem?.slug || s.problem?.title || s.id;
                    if (!seenProblems.has(id)) {
                      seenProblems.add(id);
                      uniqueSubmissions.push(s);
                      if (uniqueSubmissions.length >= 8) break;
                    }
                  }

                  if (uniqueSubmissions.length === 0) {
                    return (
                       <div className="p-8 text-center text-white/30 font-geist-mono uppercase tracking-widest border border-dashed border-white/10 mt-2">
                        <span className="animate-pulse">_</span> Awaiting input...
                      </div>
                    );
                  }

                  return uniqueSubmissions.map((s, idx) => {
                    const diffColors: Record<string, string> = { EASY: "text-[#00E5B0]", MEDIUM: "text-[#FACC15]", HARD: "text-[#FF5F56]" };
                    
                    // Remap hacker status colors
                    let statusColor = "text-white/40";
                    let bgGlow = "hover:bg-white/5 hover:border-white/10";
                    if (s.status === "ACCEPTED") {
                      statusColor = "text-[#00E5B0]";
                      bgGlow = "hover:bg-[#00E5B0]/5 hover:border-white/5";
                    } else if (["WRONG_ANSWER", "WRONG_ANSWER_ON_HIDDEN_TEST", "RUNTIME_ERROR", "COMPILATION_ERROR"].includes(s.status)) {
                      statusColor = "text-[#FF5F56]";
                      bgGlow = "hover:bg-[#FF5F56]/5 hover:border-white/5";
                    } else if (["TIME_LIMIT_EXCEEDED", "MEMORY_LIMIT_EXCEEDED"].includes(s.status)) {
                      statusColor = "text-[#FACC15]";
                      bgGlow = "hover:bg-[#FACC15]/5 hover:border-white/5";
                    }

                    return (
                      <div key={s.id} className={`flex flex-col md:flex-row md:items-center justify-between p-3 gap-3 md:gap-6 border border-transparent transition-colors duration-200 group ${bgGlow}`}>
                        {/* Left side: Pointer, Title, Difficulty */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                           <span className={`${statusColor} opacity-50 text-[10px]`}>{(idx + 1).toString().padStart(2, '0')}</span>
                           <span className="text-[#00C2FF] text-[8px] animate-pulse">❯</span>
                           <span className="font-bold text-white/80 group-hover:text-white transition-colors truncate">
                             {s.problem.title.replace(/-/g, " ")}
                           </span>
                           <span className={`text-[9px] px-1.5 py-0.5 border border-current rounded-[2px] ${diffColors[s.problem.difficulty.toUpperCase()] || "text-white/40 border-white/10"}`}>
                             {s.problem.difficulty.charAt(0)}
                           </span>
                        </div>

                        {/* Right side: Status, Lang, Runtime, Date */}
                        <div className="flex items-center gap-4 text-[10px] sm:text-[11px] justify-between md:justify-end shrink-0 pl-7 md:pl-0">
                          <span className={`${statusColor} font-bold min-w-[70px] transition-all group-hover:drop-shadow-[0_0_8px_currentColor]`}>
                            {formatStatus(s.status)}
                          </span>
                          
                          <div className="flex items-center gap-4 text-white/40">
                             <span className="w-12 truncate">{s.language}</span>
                             <span className="w-12 text-right">
                               {s.runtime != null ? <span className="text-white/60">{s.runtime}ms</span> : <span>--</span>}
                             </span>
                             <span className="text-white/20 whitespace-nowrap min-w-[65px] text-right">
                               {(new Date(s.createdAt)).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                             </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </>
      )}

      {!stats && !user && (
        <div className="flex flex-col items-center justify-center py-32 text-center stagger-1 animate-fade-in-up">
          <div className="w-24 h-24 rounded-full bg-[var(--background)] border border-[var(--border)] shadow-[0_0_30px_rgba(138,43,226,0.2)] flex items-center justify-center mb-8">
             <Lock size={32} className="text-[var(--primary)]" />
          </div>
          <h2 className="text-3xl font-bold uppercase tracking-tight mb-4 text-gradient">Neural Link Severed</h2>
          <p className="text-[var(--text-secondary)] text-sm max-w-md leading-relaxed font-mono">
            Authenticate your console session to view operative statistics, neuro-metrics, and leaderboard status.
          </p>
        </div>
      )}

      {/* ── Activity History Modal ── */}
      {mounted && isHistoryOpen && submissions && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm bg-black/40 p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#0A0F14]/90 border border-white/10 w-full max-w-4xl shadow-2xl flex flex-col relative animate-in zoom-in-[0.98] duration-200 max-h-[90vh] backdrop-blur-md">
            {/* Terminal Frame Brackets */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00C2FF]" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00C2FF]" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00C2FF]" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00C2FF]" />

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#05070A] relative z-10 w-full mb-2 shrink-0">
              <span className="text-[12px] md:text-[14px] font-geist-mono text-[#00C2FF] font-bold tracking-[0.2em] flex items-center gap-3">
                <span className="text-white animate-pulse">■</span> [ // FULL_ACTIVITY_ARCHIVE ]
              </span>
              <div className="flex items-center gap-6">
                {(() => {
                  const sourceArray = submissions.length > 0 ? submissions : (stats?.recentActivity || []);
                  const uniqueCount = new Set(sourceArray.map(s => s.problem?.slug || s.problem?.title || s.id)).size;
                  return (
                    <span className="text-[9px] md:text-[10px] font-geist-mono text-white/40 tracking-widest hidden sm:block">
                      TOTAL_UNIQUE_TARGETS: <span className="text-[#00E5B0]">{uniqueCount}</span>
                    </span>
                  );
                })()}
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="text-[12px] font-geist-mono text-[#FF5F56] hover:text-white transition-colors tracking-widest font-bold"
                >
                  [ X ]
                </button>
              </div>
            </div>

            {/* Scrollable Content Container */}
            <div className="relative w-full px-6 pb-6 overflow-y-auto custom-scrollbar flex-grow">
              <div className="flex flex-col gap-[2px] font-geist-mono text-[11px] uppercase tracking-wider relative z-10">
                {(() => {
                  const sourceArray = submissions.length > 0 ? submissions : (stats?.recentActivity || []);
                  const uniqueSubmissions: SubmissionHistoryItem[] = [];
                  const seenProblems = new Set();
                  
                  for (const s of sourceArray) {
                    const id = s.problem?.slug || s.problem?.title || s.id;
                    if (!seenProblems.has(id)) {
                      seenProblems.add(id);
                      uniqueSubmissions.push(s);
                    }
                  }

                  if (uniqueSubmissions.length === 0) {
                    return (
                       <div className="p-12 text-center text-white/30 font-geist-mono uppercase tracking-widest border border-dashed border-white/10 mt-4">
                        <span className="animate-pulse">_</span> NO ARCHIVE DATA FOUND.
                      </div>
                    );
                  }

                  return uniqueSubmissions.map((s, idx) => {
                    const diffColors: Record<string, string> = { EASY: "text-[#00E5B0]", MEDIUM: "text-[#FACC15]", HARD: "text-[#FF5F56]" };
                    
                    let statusColor = "text-white/40";
                    let bgGlow = "hover:bg-white/5 hover:border-white/10";
                    if (s.status === "ACCEPTED") {
                      statusColor = "text-[#00E5B0]";
                      bgGlow = "hover:bg-[#00E5B0]/5 hover:border-white/5";
                    } else if (["WRONG_ANSWER", "WRONG_ANSWER_ON_HIDDEN_TEST", "RUNTIME_ERROR", "COMPILATION_ERROR"].includes(s.status)) {
                      statusColor = "text-[#FF5F56]";
                      bgGlow = "hover:bg-[#FF5F56]/5 hover:border-white/5";
                    } else if (["TIME_LIMIT_EXCEEDED", "MEMORY_LIMIT_EXCEEDED"].includes(s.status)) {
                      statusColor = "text-[#FACC15]";
                      bgGlow = "hover:bg-[#FACC15]/5 hover:border-white/5";
                    }

                    return (
                      <div key={s.id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 md:gap-8 border border-transparent transition-colors duration-200 group ${bgGlow}`}>
                        {/* Left side */}
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                           <span className={`${statusColor} opacity-50 text-[10px]`}>{(idx + 1).toString().padStart(3, '0')}</span>
                           <span className="text-[#00C2FF] text-[8px] animate-pulse">❯</span>
                           <span className="font-bold text-white/80 group-hover:text-white transition-colors truncate">
                             {s.problem.title.replace(/-/g, " ")}
                           </span>
                           <span className={`text-[10px] px-2 py-0.5 border border-current rounded-[2px] ${diffColors[s.problem.difficulty.toUpperCase()] || "text-white/40 border-white/10"}`}>
                             {s.problem.difficulty}
                           </span>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-6 text-[11px] justify-between md:justify-end shrink-0 pl-8 md:pl-0">
                          <span className={`${statusColor} font-bold min-w-[80px] transition-all group-hover:drop-shadow-[0_0_8px_currentColor]`}>
                            {formatStatus(s.status)}
                          </span>
                          
                          <div className="flex items-center gap-6 text-white/40">
                             <span className="w-16 truncate text-right">{s.language}</span>
                             <span className="w-16 text-right">
                               {s.runtime != null ? <span className="text-white/60">{s.runtime}ms</span> : <span>--</span>}
                             </span>
                             <span className="text-white/20 whitespace-nowrap min-w-[80px] text-right">
                               {(new Date(s.createdAt)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}
                             </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      , document.body)}
      </div>
    </div>
  );
}
