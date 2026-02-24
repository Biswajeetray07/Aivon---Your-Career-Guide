"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession, listProblems, type Problem } from "@/lib/api";
import { motion } from "framer-motion";
import RoadmapView from "@/components/RoadmapView";

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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [activityDots, setActivityDots] = useState<{r1: number, r2: number}[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setActivityDots(Array.from({ length: 42 }).map(() => ({ r1: Math.random(), r2: Math.random() })));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    Promise.all([
      getSession(),
      listProblems({ limit: 12 })
    ])
      .then(([sessionRes, problemsRes]) => {
        if (!sessionRes?.user) {
          router.push("/sign-in");
        } else {
          setUser(sessionRes.user);
          setProblems(problemsRes.problems || []);
        }
      })
      .catch(() => router.push("/sign-in"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#39FF14", fontFamily: "'JetBrains Mono', monospace", animation: "pulse 1.5s infinite" }}>
          &gt; INITIATING COMMAND CENTER...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050505",
      color: "#fff",
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      position: "relative",
      padding: "8vh 5vw",
      overflowX: "hidden"
    }}>
      {/* Interactive Cyber Background */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(circle at 50% -20%, rgba(138,43,226,0.15), transparent 60%), radial-gradient(circle at 120% 50%, rgba(0,255,255,0.08), transparent 50%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      <main style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto" }}>
        
        {/* Header Section */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 64, display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "1px solid #27272a", paddingBottom: 32 }}
        >
          <div>
            <div style={{ color: "#71717a", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, textTransform: "uppercase", marginBottom: 8, letterSpacing: "0.1em" }}>
              PILOT LOGGED IN // STATUS: ONLINE
            </div>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 900, margin: 0, letterSpacing: "-0.04em", textTransform: "uppercase" }}>
              WELCOME BACK,<br/>
              <span style={{ color: "#39FF14" }}>{user.name || user.username || "OPERATIVE"}</span>
            </h1>
          </div>
          <div>
             <Link href="/profile" style={{ display: "inline-block", background: "transparent", color: "#fff", border: "1px solid #52525b", padding: "12px 24px", textDecoration: "none", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.2s", minWidth: 160, textAlign: "center" }}
                   onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#00E5FF"; e.currentTarget.style.background = "#00E5FF"; e.currentTarget.style.color = "#050505"; }}
                   onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#52525b"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#fff"; }}>
               View Profile
             </Link>
          </div>
        </motion.header>

        {/* Dashboard Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 2fr) minmax(300px, 1fr)", gap: 32, alignItems: "start" }}>
          
          {/* Main Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            
            {/* Top Stat Band - Glassmorphic */}
            <div style={{ 
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16,
              animation: "slideUp 0.6s ease-out 0.1s both"
            }}>
              {[
                { label: "RANK", value: user.rank ? `#${user.rank}` : "UNRANKED", color: "#39FF14" },
                { label: "RATING", value: user.rating || 1200, color: "#00FFFF" },
                { label: "SYNERGY (XP)", value: user.xp || 0, color: "#8A2BE2" }
              ].map((s, i) => (
                <div key={i} style={{ 
                  background: "rgba(20, 20, 25, 0.6)", 
                  backdropFilter: "blur(12px)", 
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderTop: `1px solid ${s.color}40`,
                  padding: 24, 
                  borderRadius: 16,
                  boxShadow: `0 4px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`,
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = `0 8px 30px ${s.color}20, inset 0 1px 0 rgba(255,255,255,0.1)`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = `0 4px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`;
                }}>
                  <div style={{ fontSize: 11, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: s.color, letterSpacing: "-0.02em", textShadow: `0 0 20px ${s.color}40` }}>{s.value}</div>
                </div>
              ))}
            </div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              style={{
                background: "rgba(20, 20, 25, 0.4)", 
                backdropFilter: "blur(12px)", 
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 16,
                padding: "24px 32px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.1em" }}>Neural Activity Sync</div>
                <div style={{ fontSize: 11, color: "#39FF14", background: "rgba(57, 255, 20, 0.1)", padding: "4px 8px", borderRadius: 4, fontFamily: "'JetBrains Mono', monospace" }}>[ONLINE]</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", opacity: 0.6 }}>
                {activityDots.map((dot, i) => (
                  <div key={i} style={{ 
                    width: "calc(100% / 14 - 6px)", 
                    aspectRatio: "1", 
                    background: dot.r1 > 0.7 ? (dot.r2 > 0.5 ? "#00FFFF" : "#8A2BE2") : "rgba(255,255,255,0.03)", 
                    borderRadius: 4,
                    boxShadow: dot.r1 > 0.7 ? "0 0 10px currentColor" : "none"
                  }} />
                ))}
              </div>
            </motion.div>

            {/* Roadmap Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              style={{
                background: "rgba(20, 20, 25, 0.4)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 16,
                padding: "32px",
                position: "relative",
                overflow: "hidden"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.1em" }}>Progress Roadmap</div>
                <div style={{ fontSize: 11, color: "#00FFFF", background: "rgba(0, 255, 255, 0.1)", padding: "4px 8px", borderRadius: 4, fontFamily: "'JetBrains Mono', monospace" }}>[LIVE PATH]</div>
              </div>
              
              <div style={{ minHeight: "400px", position: "relative" }}>
                 <RoadmapView problems={problems} />
              </div>
            </motion.div>

            {/* Resume Card (Neon-Noir "Continue where you left off") aria-label */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               style={{ 
                 background: "rgba(57, 255, 20, 0.05)", 
                 border: "1px solid rgba(57, 255, 20, 0.3)",
                 boxShadow: "0 0 40px rgba(57, 255, 20, 0.05), inset 0 0 20px rgba(57, 255, 20, 0.02)",
                 backdropFilter: "blur(12px)",
                 borderRadius: 16, 
                 padding: "40px", 
                 position: "relative",
                 overflow: "hidden"
               }}
            >
               {/* Decorative structural line */}
               <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: "#39FF14", boxShadow: "0 0 15px #39FF14" }} />
               
               <div style={{ position: "absolute", top: 20, right: 24, fontSize: 11, fontWeight: 800, color: "#39FF14", fontFamily: "'JetBrains Mono', monospace", opacity: 0.7, letterSpacing: "0.1em" }}>[PRIORITY TARGET]</div>
               <h2 style={{ fontSize: 36, fontWeight: 900, color: "#fff", textTransform: "uppercase", letterSpacing: "-0.03em", margin: "0 0 16px 0", textShadow: "0 2px 10px rgba(255,255,255,0.1)" }}>
                 Two Sum
               </h2>
               <p style={{ fontSize: 15, fontWeight: 500, color: "#a1a1aa", lineHeight: 1.6, margin: "0 0 32px 0", maxWidth: "85%" }}>
                 You abandoned this sequence 4 hours ago. Re-engage the target array and find the indices that sum to the target to restore synchronization.
               </p>
               
               <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                 <Link href="/problems/two-sum" style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "#39FF14", color: "#050505", padding: "14px 28px", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", transition: "transform 0.2s, box-shadow 0.2s" }}
                       onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 25px rgba(57, 255, 20, 0.4)"; }}
                       onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                   RE-ENGAGE TARGET
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                 </Link>
                 <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#39FF14", border: "1px solid rgba(57, 255, 20, 0.3)", background: "rgba(57, 255, 20, 0.05)", padding: "6px 12px", borderRadius: 6 }}>EASY</span>
                 <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#00FFFF", border: "1px solid rgba(0, 255, 255, 0.3)", background: "rgba(0, 255, 255, 0.05)", padding: "6px 12px", borderRadius: 6 }}>ARRAYS</span>
               </div>
            </motion.div>

          </div>

          {/* Secondary Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

             {/* Navigation Actions */}
             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.3 }}
               style={{ 
                 background: "rgba(20, 20, 25, 0.6)", 
                 backdropFilter: "blur(12px)", 
                 border: "1px solid rgba(255,255,255,0.05)",
                 borderTop: "1px solid rgba(138,43,226,0.3)",
                 borderRadius: 16,
                 padding: 32,
                 boxShadow: "0 4px 30px rgba(0,0,0,0.5)"
               }}
             >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ width: 8, height: 8, background: "#8A2BE2", borderRadius: "50%", boxShadow: "0 0 10px #8A2BE2" }} />
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                    Operations
                  </h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                   <Link href="/problems" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.3)", padding: "16px", borderRadius: 8, textDecoration: "none", color: "#fff", border: "1px solid rgba(255,255,255,0.05)", transition: "all 0.2s" }}
                         onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8A2BE2"; e.currentTarget.style.background = "rgba(138,43,226,0.1)"; e.currentTarget.style.boxShadow = "0 0 15px rgba(138,43,226,0.2)"; }}
                         onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.background = "rgba(0,0,0,0.3)"; e.currentTarget.style.boxShadow = "none"; }}>
                     <span style={{ fontWeight: 700, fontSize: 14 }}>Explore Problem Matrix</span>
                     <span style={{ color: "#8A2BE2", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.05em" }}>[ENTER]</span>
                   </Link>
                   <Link href="/leaderboard" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.3)", padding: "16px", borderRadius: 8, textDecoration: "none", color: "#fff", border: "1px solid rgba(255,255,255,0.05)", transition: "all 0.2s" }}
                         onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#00FFFF"; e.currentTarget.style.background = "rgba(0,255,255,0.1)"; e.currentTarget.style.boxShadow = "0 0 15px rgba(0,255,255,0.2)"; }}
                         onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.background = "rgba(0,0,0,0.3)"; e.currentTarget.style.boxShadow = "none"; }}>
                     <span style={{ fontWeight: 700, fontSize: 14 }}>Global Hierarchy</span>
                     <span style={{ color: "#00FFFF", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.05em" }}>[VIEW]</span>
                   </Link>
                </div>
             </motion.div>

             {/* Recent Activity */}
             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.4 }}
               style={{ 
                 background: "rgba(20, 20, 25, 0.4)", 
                 backdropFilter: "blur(12px)", 
                 border: "1px dashed rgba(255,255,255,0.1)",
                 borderRadius: 16,
                 padding: 32 
               }}
             >
               <h3 style={{ fontSize: 12, fontWeight: 800, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
                 <div style={{ width: 6, height: 6, background: "#71717a", borderRadius: "50%" }} />
                 System Feed
               </h3>
               <div style={{ color: "#a1a1aa", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.8 }}>
                  <span style={{ color: "#8A2BE2" }}>&gt;</span> Loading neuro-metrics...<br/>
                  <span style={{ color: "#ef4444" }}>&gt;</span> No recent successful compilations found.<br/>
                  <span style={{ color: "#39FF14" }}>&gt;</span> Recommendation: Engage targets immediately.
               </div>
             </motion.div>

          </div>

        </div>
      </main>
    </div>
  );
}
