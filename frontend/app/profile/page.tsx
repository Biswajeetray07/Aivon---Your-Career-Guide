"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { getMyStats, getSession, getMySubmissions, type SubmissionHistoryItem } from "@/lib/api";

/* ─── SVG Donut for Verdict Distribution ─── */
function VerdictDonut({ data }: { data: { label: string; count: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;

  const R = 45, CX = 60, CY = 60, C = 2 * Math.PI * R;
  let offset = 0;

  const slices = data.filter(d => d.count > 0).map((d) => {
    const fraction = d.count / total;
    const dash = fraction * C;
    const gap = C - dash;
    const rotate = (offset / total) * 360;
    offset += d.count;
    return { ...d, dash, gap, rotate };
  });

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
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L ${coords.at(-1)!.x} ${H} L ${coords[0].x} ${H} Z`} fill="url(#rtGrad)" />
        <path d={pathD} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="4" fill="#a855f7" stroke="#0a0a0f" strokeWidth="2">
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
  ACCEPTED: "#22c55e", WRONG_ANSWER: "#ef4444",
  TIME_LIMIT_EXCEEDED: "#eab308", RUNTIME_ERROR: "#f97316",
  COMPILATION_ERROR: "#ef4444", INTERNAL_ERROR: "#6b7280",
  MEMORY_LIMIT_EXCEEDED: "#eab308",
};

const formatStatus = (s: string) => {
  const map: Record<string, string> = {
    ACCEPTED: "Accepted", WRONG_ANSWER: "Wrong Answer",
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

  useEffect(() => {
    Promise.all([getMyStats(), getSession()])
      .then(([s, sess]) => { setStats(s); setUser(sess.user); })
      .catch(console.error);
    getMySubmissions({ limit: 20 })
      .then(d => setSubmissions(d.submissions))
      .catch(() => {}); // graceful — might not be logged in
  }, []);

  const diffColors = { EASY: "var(--green)", MEDIUM: "var(--yellow)", HARD: "var(--red)" };

  // Compute verdict distribution from recent submissions
  const verdictGroups = submissions.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  const verdictData = [
    { label: "Accepted",    count: verdictGroups["ACCEPTED"] ?? 0,              color: "#22c55e" },
    { label: "Wrong Answer",count: verdictGroups["WRONG_ANSWER"] ?? 0,          color: "#ef4444" },
    { label: "TLE",         count: verdictGroups["TIME_LIMIT_EXCEEDED"] ?? 0,   color: "#eab308" },
    { label: "Runtime Err", count: verdictGroups["RUNTIME_ERROR"] ?? 0,         color: "#f97316" },
    { label: "Compile Err", count: verdictGroups["COMPILATION_ERROR"] ?? 0,     color: "#a855f7" },
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
    <div className="layout">
      <Sidebar />
      <main className="main">

        {/* ── User Header ── */}
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
            {/* ── Key Stats ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 32 }}>
              {[
                { label: "Problems Solved",    value: stats.totalSolved,          color: "var(--accent-purple-light)" },
                { label: "Total Submissions",  value: stats.totalSubmissions,     color: "var(--accent-blue)" },
                { label: "Acceptance Rate",    value: `${stats.accuracy}%`,       color: "var(--green)" },
                ...(avgRuntime != null ? [{ label: "Avg Runtime",   value: `${avgRuntime}ms`,   color: "#a78bfa" }] : []),
                ...(topLang ? [{ label: "Top Language",  value: topLang[0].charAt(0).toUpperCase() + topLang[0].slice(1), color: "#60a5fa" }] : []),
              ].map(s => (
                <div key={s.label} className="card" style={{ padding: 20, textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── Analytics Row ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>

              {/* Verdict Pie */}
              <div className="card" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: "var(--text-primary)" }}>
                  📊 Submission Verdicts
                </h2>
                {submissions.length > 0 ? (
                  <VerdictDonut data={verdictData} />
                ) : (
                  <div style={{ color: "#4a4a6a", fontSize: 13, textAlign: "center", padding: 20 }}>No submissions yet.</div>
                )}
              </div>

              {/* Runtime Trend */}
              <div className="card" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: "var(--text-primary)" }}>
                  ⏱ Runtime Trend (Accepted)
                </h2>
                <RuntimeTrend points={runtimePoints} />
              </div>
            </div>

            {/* ── Difficulty Breakdown ── */}
            <div className="card" style={{ padding: 24, marginBottom: 32 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Solved by Difficulty</h2>
              <div style={{ display: "flex", gap: 24 }}>
                {Object.entries(stats.byDifficulty).map(([diff, count]) => {
                  const total = Object.values(stats.byDifficulty).reduce((a, b) => a + b, 0);
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={diff} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: diffColors[diff as keyof typeof diffColors] }}>{count}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{diff}</div>
                      <div style={{ height: 6, borderRadius: 3, marginTop: 8, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: diffColors[diff as keyof typeof diffColors], borderRadius: 3, transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Recent Submissions ── */}
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>Recent Submissions</h2>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Last {submissions.length}</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {((submissions.length > 0 ? submissions : stats.recentActivity) as Array<{
                    id: string; status: string; language: string; createdAt: string; runtime?: number | null;
                    problem: { title: string; slug: string; difficulty: string };
                  }>).slice(0, 15).map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.12s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "11px 20px", fontSize: 14 }}>{s.problem.title.replace(/-/g, " ")}</td>
                      <td style={{ padding: "11px 20px" }}><span className={`badge-${s.problem.difficulty.toLowerCase()}`}>{s.problem.difficulty}</span></td>
                      <td style={{ padding: "11px 20px", fontSize: 13, fontWeight: 600, color: STATUS_COLOR[s.status] ?? "#8b8ca7" }}>
                        {formatStatus(s.status)}
                      </td>
                      <td style={{ padding: "11px 20px", fontSize: 12, color: "var(--text-muted)" }}>{s.language}</td>
                      {s.runtime != null && (
                        <td style={{ padding: "11px 20px", fontSize: 12, color: "#a78bfa" }}>{s.runtime}ms</td>
                      )}
                      <td style={{ padding: "11px 20px", fontSize: 12, color: "var(--text-muted)" }}>
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
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
