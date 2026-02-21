"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { getLeaderboard } from "@/lib/api";

type LeaderboardEntry = { rank: number; userId: string; name: string | null; email: string; rating: number; solved: number };

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard().then((d) => setData(d.leaderboard)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const rankStyles = (rank: number) => ({
    1: { bg: "rgba(255, 215, 0, 0.1)", border: "rgba(255,215,0,0.3)", badge: "🥇" },
    2: { bg: "rgba(192,192,192,0.1)", border: "rgba(192,192,192,0.3)", badge: "🥈" },
    3: { bg: "rgba(205,127,50,0.1)", border: "rgba(205,127,50,0.3)", badge: "🥉" },
  }[rank] || { bg: "transparent", border: "var(--border)", badge: `#${rank}` });

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Leaderboard</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: 32, fontSize: 14 }}>Top coders ranked by rating</p>

        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Rank", "User", "Rating", "Solved", ""].map((h) => (
                  <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading leaderboard...</td></tr>
              ) : data.map((entry) => {
                const style = rankStyles(entry.rank);
                return (
                  <tr key={entry.userId} style={{ borderBottom: "1px solid var(--border)", background: style.bg, transition: "background 0.15s" }}
                    onMouseEnter={(e) => !style.bg.includes("transparent") || (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = style.bg)}>
                    <td style={{ padding: "16px 20px", fontSize: 18 }}>{style.badge}</td>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-purple), var(--accent-blue))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
                          {(entry.name || entry.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{entry.name || entry.email.split("@")[0]}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{entry.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: "var(--accent-purple-light)" }}>{entry.rating}</span>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{ fontWeight: 600, color: "var(--green)" }}>{entry.solved}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}> solved</span>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      {entry.rank <= 3 && <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: style.bg, border: `1px solid ${style.border}`, color: "var(--text-secondary)" }}>Top Coder</span>}
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
