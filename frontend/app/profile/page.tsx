"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { getMyStats, getSession } from "@/lib/api";

export default function ProfilePage() {
  const [stats, setStats] = useState<{ totalSolved: number; totalSubmissions: number; accuracy: number; byDifficulty: { EASY: number; MEDIUM: number; HARD: number }; recentActivity: unknown[] } | null>(null);
  const [user, setUser] = useState<{ name: string | null; email: string; rating: number; createdAt: string } | null>(null);

  useEffect(() => {
    Promise.all([getMyStats(), getSession()])
      .then(([s, sess]) => { setStats(s); setUser(sess.user); })
      .catch(console.error);
  }, []);

  const diffColors = { EASY: "var(--green)", MEDIUM: "var(--yellow)", HARD: "var(--red)" };

  const formatStatus = (s: string) => {
    if (s === "WRONG_ANSWER") return "Wrong Answer";
    if (s === "TIME_LIMIT_EXCEEDED") return "Time Limit Exceeded";
    if (s === "COMPILATION_ERROR") return "Compile Error";
    if (s === "RUNTIME_ERROR" || s.includes("Runtime Error")) return "Runtime Error";
    if (s === "PENDING") return "Pending";
    if (s === "ACCEPTED") return "Accepted";
    return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-purple), var(--accent-blue))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700 }}>
              {(user.name || user.email)[0].toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700 }}>{user.name || user.email.split("@")[0]}</h1>
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>{user.email} · Member since {new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-purple-light)" }}>{user.rating}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Rating</div>
            </div>
          </div>
        )}

        {stats && (
          <>
            {/* Key stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
              {[
                { label: "Problems Solved", value: stats.totalSolved, color: "var(--accent-purple-light)" },
                { label: "Total Submissions", value: stats.totalSubmissions, color: "var(--accent-blue)" },
                { label: "Accuracy", value: `${stats.accuracy}%`, color: "var(--green)" },
              ].map((s) => (
                <div key={s.label} className="card" style={{ padding: 24, textAlign: "center" }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Difficulty breakdown */}
            <div className="card" style={{ padding: 24, marginBottom: 32 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Solved by Difficulty</h2>
              <div style={{ display: "flex", gap: 24 }}>
                {Object.entries(stats.byDifficulty).map(([diff, count]) => (
                  <div key={diff} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: diffColors[diff as keyof typeof diffColors] }}>{count}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{diff}</div>
                    <div style={{ height: 4, borderRadius: 2, background: diffColors[diff as keyof typeof diffColors], opacity: 0.3, marginTop: 8 }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Recent activity */}
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Activity</h2>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {(stats.recentActivity as Array<{ id: string; status: string; language: string; createdAt: string; problem: { title: string; slug: string; difficulty: string } }>).map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 20px", fontSize: 14 }}>{s.problem.title.replace(/-/g, " ")}</td>
                      <td style={{ padding: "12px 20px" }}><span className={`badge-${s.problem.difficulty.toLowerCase()}`}>{s.problem.difficulty}</span></td>
                      <td style={{ padding: "12px 20px", fontSize: 13, color: s.status === "ACCEPTED" ? "var(--green)" : "var(--red)", fontWeight: 600 }}>{formatStatus(s.status)}</td>
                      <td style={{ padding: "12px 20px", fontSize: 12, color: "var(--text-muted)" }}>{s.language}</td>
                      <td style={{ padding: "12px 20px", fontSize: 12, color: "var(--text-muted)" }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!stats && !user && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Sign in to view your profile</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Track your progress and compete on the leaderboard</p>
          </div>
        )}
      </main>
    </div>
  );
}
