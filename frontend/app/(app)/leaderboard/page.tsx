"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { getLeaderboard } from "@/lib/api";

type LeaderboardEntry = { rank: number; userId: string; name: string | null; email: string; rating: number; solved: number };

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard().then((d) => setData(d.leaderboard)).catch(e => console.warn("Leaderboard fetch failed:", e.message)).finally(() => setLoading(false));
  }, []);

  const rankStyles = (rank: number) => ({
    1: { bg: "rgba(255, 215, 0, 0.1)", border: "#FFD700", badge: "🥇", glow: "0 0 20px rgba(255,215,0,0.5)" },
    2: { bg: "rgba(192, 192, 192, 0.1)", border: "#C0C0C0", badge: "🥈", glow: "0 0 15px rgba(192,192,192,0.4)" },
    3: { bg: "rgba(205, 127, 50, 0.1)", border: "#CD7F32", badge: "🥉", glow: "0 0 15px rgba(205,127,50,0.4)" },
  }[rank] || { bg: "transparent", border: "rgba(255,255,255,0.05)", badge: `#${rank}`, glow: "none" });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#050505", color: "#fff", position: "relative" }}>
      {/* Interactive Cyber Background */}
      <div style={{
        position: "fixed", inset: 0,
        background: "radial-gradient(circle at 60% 10%, rgba(0,255,255,0.08), transparent 50%), radial-gradient(circle at 10% 80%, rgba(138,43,226,0.1), transparent 50%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
        backgroundSize: "48px 48px", pointerEvents: "none", zIndex: 0,
      }} />

      <Sidebar />
      <main style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 10, padding: "5vh 6vw", fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
        
        <div style={{ marginBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 20 }}>
          <h1 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", margin: "0 0 8px 0", textShadow: "0 0 20px rgba(0,255,255,0.3)" }}>
            Global Nexus
          </h1>
          <p style={{ color: "#a1a1aa", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", margin: 0 }}>
            <span style={{ color: "#39FF14" }}>{"//"}</span> TOP OPERATIVES RANKED BY NEURAL RATING
          </p>
        </div>

        <div style={{
          background: "rgba(20, 20, 25, 0.4)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.05)", borderRadius: 24, overflow: "hidden",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                {["Rank", "User", "Rating", "Solved", "Status"].map((h) => (
                  <th key={h} style={{ padding: "20px 24px", textAlign: "left", fontSize: 11, color: "#71717a", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 60, textAlign: "center", color: "#a1a1aa", fontFamily: "'JetBrains Mono', monospace" }}>INITIALIZING SATELLITE UPLINK...</td></tr>
              ) : data.map((entry) => {
                const style = rankStyles(entry.rank);
                return (
                  <tr key={entry.userId} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)", background: style.bg, transition: "background 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = entry.rank > 3 ? "rgba(255,255,255,0.02)" : style.bg)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = style.bg)}>
                    <td style={{ padding: "16px 24px", fontSize: 18, color: "#fff", fontWeight: 800, textShadow: style.glow }}>{style.badge}</td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: entry.rank <= 3 ? `linear-gradient(135deg, ${style.border}, #050505)` : "linear-gradient(135deg, #8A2BE2, #00FFFF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: entry.rank <= 3 ? "#050505" : "#050505", boxShadow: entry.rank <= 3 ? style.glow : "none" }}>
                          {(entry.name || entry.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: "#fff", letterSpacing: "0.02em" }}>{entry.name || entry.email.split("@")[0]}</div>
                          <div style={{ fontSize: 11, color: "#71717a", fontFamily: "'JetBrains Mono', monospace" }}>{entry.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ fontWeight: 900, fontSize: 20, color: "#00FFFF", textShadow: "0 0 15px rgba(0,255,255,0.3)" }}>{entry.rating}</span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ fontWeight: 800, color: "#39FF14", fontSize: 16, border: "1px solid rgba(57,255,20,0.2)", background: "rgba(57,255,20,0.05)", padding: "4px 10px", borderRadius: 8 }}>{entry.solved}</span>
                      <span style={{ color: "#71717a", fontSize: 11, marginLeft: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>resolved</span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      {entry.rank <= 3 ? (
                        <span style={{ fontSize: 10, fontWeight: 900, padding: "6px 12px", borderRadius: 8, background: style.bg, border: `1px solid ${style.border}`, color: style.border, textTransform: "uppercase", letterSpacing: "0.1em", boxShadow: style.glow }}>Prime Target</span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.1em" }}>Operative</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
