"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { getMyStats, getSession, getMySubmissions, type SubmissionHistoryItem } from "@/lib/api";

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
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        {slices.map((s, i) => (
          <circle key={i}
            cx={CX} cy={CY} r={R} fill="none"
            stroke={s.color} strokeWidth="16"
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeLinecap="butt"
            transform={`rotate(${s.rotate - 90} ${CX} ${CY})`}
          />
        ))}
        <text x={CX} y={CY - 4} textAnchor="middle" fill="#f1f0ff" fontSize="18" fontWeight="800" fontFamily="Space Grotesk, sans-serif">
          {total}
        </text>
        <text x={CX} y={CY + 14} textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="Space Grotesk, sans-serif" textLength="40">
          TOTAL
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.filter(d => d.count > 0).map((d) => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#8b8ca7", flex: 1 }}>{d.label}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: d.color }}>{d.count}</span>
            <span style={{ fontSize: 11, color: "#4a4a6a", minWidth: 32 }}>
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
    <div style={{ color: "#4a4a6a", fontSize: 13, textAlign: "center", padding: 20 }}>
      Submit more accepted solutions to see runtime trends.
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
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        {/* Area fill */}
        <defs>
          <linearGradient id="rtGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L ${coords.at(-1)!.x} ${H} L ${coords[0].x} ${H} Z`} fill="url(#rtGrad)" />
        <path d={pathD} fill="none" stroke="#00B8D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="4" fill="#00B8D4" stroke="#0a0a0f" strokeWidth="2">
            <title>{points[i].label}: {points[i].runtime}ms</title>
          </circle>
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#4a4a6a", marginTop: 4 }}>
        {points.map((p, i) => <span key={i}>{p.label}</span>)}
      </div>
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  ACCEPTED: "#22c55e", WRONG_ANSWER: "#ef4444", WRONG_ANSWER_ON_HIDDEN_TEST: "#f43f5e",
  TIME_LIMIT_EXCEEDED: "#eab308", RUNTIME_ERROR: "#f97316",
  COMPILATION_ERROR: "#ef4444", INTERNAL_ERROR: "#6b7280",
  MEMORY_LIMIT_EXCEEDED: "#eab308",
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
  const [stats, setStats] = useState<{
    totalSolved: number; totalSubmissions: number; accuracy: number;
    byDifficulty: { EASY: number; MEDIUM: number; HARD: number };
    recentActivity: unknown[];
  } | null>(null);
  const [user, setUser] = useState<{ name: string | null; email: string; rating: number; createdAt: string } | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionHistoryItem[]>([]);

  const router = useRouter();

  useEffect(() => {
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
  }, [router]);



  // Compute verdict distribution from recent submissions
  const verdictGroups = submissions.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  const verdictData = [
    { label: "Accepted",    count: verdictGroups["ACCEPTED"] ?? 0,              color: "#22c55e" },
    { label: "Wrong Answer",count: verdictGroups["WRONG_ANSWER"] ?? 0,          color: "#ef4444" },
    { label: "Hidden Test Failed",count: verdictGroups["WRONG_ANSWER_ON_HIDDEN_TEST"] ?? 0, color: "#f43f5e" },
    { label: "TLE",         count: verdictGroups["TIME_LIMIT_EXCEEDED"] ?? 0,   color: "#eab308" },
    { label: "Runtime Err", count: verdictGroups["RUNTIME_ERROR"] ?? 0,         color: "#f97316" },
    { label: "Compile Err", count: verdictGroups["COMPILATION_ERROR"] ?? 0,     color: "#00B8D4" },
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
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#050505", color: "#fff", position: "relative" }}>
      {/* Interactive Cyber Background */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(circle at 60% 10%, rgba(0,255,255,0.08), transparent 50%), radial-gradient(circle at 10% 80%, rgba(138,43,226,0.1), transparent 50%)",
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
      
      <Sidebar />
      <main style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 10, padding: "5vh 6vw", fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>

        {/* ── User Header ── */}
        {user && (
          <div style={{ 
            display: "flex", alignItems: "center", gap: 24, marginBottom: 40,
            background: "rgba(20, 20, 25, 0.4)", backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.05)", borderRadius: 24, padding: "32px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
          }}>
            <div style={{ 
              width: 80, height: 80, borderRadius: "50%", 
              background: "linear-gradient(135deg, #8A2BE2, #00FFFF)", 
              display: "flex", alignItems: "center", justifyContent: "center", 
              fontSize: 32, fontWeight: 900, color: "#050505",
              boxShadow: "0 0 20px rgba(138,43,226,0.3)"
            }}>
              {(user.name || user.email)[0].toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 8px 0", textTransform: "uppercase" }}>
                {user.name || user.email.split("@")[0]}
              </h1>
              <p style={{ color: "#a1a1aa", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", margin: 0 }}>
                {user.email} <span style={{ color: "#39FF14", margin: "0 8px" }}>{"//"}</span> LOGGED IN: {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#a1a1aa", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Neural Rating</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#00FFFF", textShadow: "0 0 20px rgba(0,255,255,0.4)" }}>{user.rating}</div>
            </div>
          </div>
        )}

        {stats && (
          <>
            {/* ── Key Stats ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
              {[
                { label: "Problems Solved",    value: stats.totalSolved,          color: "#8A2BE2" },
                { label: "Total Submissions",  value: stats.totalSubmissions,     color: "#00FFFF" },
                { label: "Acceptance Rate",    value: `${stats.accuracy}%`,       color: "#39FF14" },
                ...(avgRuntime != null ? [{ label: "Avg Runtime",   value: `${avgRuntime}ms`,   color: "#00FFFF" }] : []),
                ...(topLang ? [{ label: "Top Language",  value: topLang[0].charAt(0).toUpperCase() + topLang[0].slice(1), color: "#60a5fa" }] : []),
              ].map(s => (
                <div key={s.label} style={{ 
                  background: "rgba(20, 20, 25, 0.4)", backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.05)", borderTop: `1px solid ${s.color}40`,
                  padding: "24px", borderRadius: 16, textAlign: "center",
                  boxShadow: "0 4px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
                  transition: "transform 0.2s, box-shadow 0.2s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = `0 8px 30px ${s.color}20, inset 0 1px 0 rgba(255,255,255,0.1)`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = `0 4px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`;
                }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: s.color, letterSpacing: "-0.02em", textShadow: `0 0 20px ${s.color}40` }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── Analytics Row ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>

              {/* Verdict Pie */}
              <div style={{
                background: "rgba(20, 20, 25, 0.4)", backdropFilter: "blur(12px)",
                border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16, padding: "32px",
                display: "flex", flexDirection: "column"
              }}>
                <h2 style={{ fontSize: 13, fontWeight: 800, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 6, height: 6, background: "#71717a", borderRadius: "50%" }} />
                  Submission Verdicts
                </h2>
                {submissions.length > 0 ? (
                  <VerdictDonut data={verdictData} />
                ) : (
                  <div style={{ color: "#4a4a6a", fontSize: 13, textAlign: "center", padding: 20, fontFamily: "'JetBrains Mono', monospace" }}>No neural links established yet.</div>
                )}
              </div>

              {/* Runtime Trend */}
              <div style={{
                background: "rgba(20, 20, 25, 0.4)", backdropFilter: "blur(12px)",
                border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16, padding: "32px"
              }}>
                <h2 style={{ fontSize: 13, fontWeight: 800, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 6, height: 6, background: "#71717a", borderRadius: "50%" }} />
                  Runtime Trend
                </h2>
                <RuntimeTrend points={runtimePoints} />
              </div>
            </div>

            {/* ── Difficulty Breakdown ── */}
            <div style={{
              background: "rgba(20, 20, 25, 0.4)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "32px", marginBottom: 32,
              boxShadow: "0 4px 30px rgba(0,0,0,0.5)"
            }}>
              <h2 style={{ fontSize: 13, fontWeight: 800, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                Target Matrix Resolved
              </h2>
              <div style={{ display: "flex", gap: 24 }}>
                {Object.entries(stats.byDifficulty).map(([diff, count]) => {
                  const total = Object.values(stats.byDifficulty).reduce((a, b) => a + b, 0);
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  // Override colors to use Neon-Noir scheme instead of var(--color) hooks
                  const colorOverride: Record<string, string> = { EASY: "#39FF14", MEDIUM: "#eab308", HARD: "#ef4444" };
                  const barColor = colorOverride[diff] || "#fff";
                  return (
                    <div key={diff} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 32, fontWeight: 900, color: barColor, letterSpacing: "-0.02em", textShadow: `0 0 20px ${barColor}40` }}>{count}</div>
                      <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>{diff}</div>
                      <div style={{ height: 4, borderRadius: 2, marginTop: 12, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 2, transition: "width 0.6s ease", boxShadow: `0 0 10px ${barColor}` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Recent Submissions ── */}
            <div style={{
              background: "rgba(20, 20, 25, 0.4)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, overflow: "hidden",
              boxShadow: "0 4px 30px rgba(0,0,0,0.5)"
            }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.3)" }}>
                <h2 style={{ fontSize: 13, fontWeight: 800, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Recent Activity Feed</h2>
                <span style={{ fontSize: 11, color: "#39FF14", fontFamily: "'JetBrains Mono', monospace", background: "rgba(57, 255, 20, 0.1)", padding: "4px 8px", borderRadius: 4 }}>Last {submissions.length}</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {((submissions.length > 0 ? submissions : stats.recentActivity) as Array<{
                    id: string; status: string; language: string; createdAt: string; runtime?: number | null;
                    problem: { title: string; slug: string; difficulty: string };
                  }>).slice(0, 15).map((s) => {
                    const diffColors: Record<string, string> = { EASY: "#39FF14", MEDIUM: "#eab308", HARD: "#ef4444" };
                    return (
                      <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)", transition: "background 0.2s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "16px 24px", fontSize: 13, fontWeight: 700, color: "#fff" }}>{s.problem.title.replace(/-/g, " ")}</td>
                        <td style={{ padding: "16px 24px" }}>
                          <span style={{ 
                            fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", padding: "4px 10px", borderRadius: 6,
                            color: diffColors[s.problem.difficulty.toUpperCase()] || "#fff",
                            border: `1px solid ${diffColors[s.problem.difficulty.toUpperCase()]}40`,
                            background: `${diffColors[s.problem.difficulty.toUpperCase()]}15`
                          }}>
                            {s.problem.difficulty}
                          </span>
                        </td>
                        <td style={{ padding: "16px 24px", fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: STATUS_COLOR[s.status] ?? "#8b8ca7" }}>
                          {formatStatus(s.status)}
                        </td>
                        <td style={{ padding: "16px 24px", fontSize: 11, color: "#a1a1aa", fontFamily: "'JetBrains Mono', monospace" }}>{s.language}</td>
                        {s.runtime != null && (
                          <td style={{ padding: "16px 24px", fontSize: 11, color: "#00FFFF", fontFamily: "'JetBrains Mono', monospace" }}>{s.runtime}ms</td>
                        )}
                        <td style={{ padding: "16px 24px", fontSize: 11, color: "#71717a", textAlign: "right" }}>
                          {new Date(s.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!stats && !user && (
          <div style={{ textAlign: "center", padding: "100px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 24, filter: "drop-shadow(0 0 20px rgba(138,43,226,0.6))" }}>🔒</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12, textTransform: "uppercase", letterSpacing: "-0.02em" }}>Neural Link Severed</h2>
            <p style={{ color: "#a1a1aa", fontSize: 14, maxWidth: 400, lineHeight: 1.6 }}>Authenticate your console session to view operative statistics, neuro-metrics, and leaderboard status.</p>
          </div>
        )}
      </main>
    </div>
  );
}
