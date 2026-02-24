"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { listProblems, type Problem } from "@/lib/api";

const DIFFICULTIES = ["", "EASY", "MEDIUM", "HARD"];
const TAGS = ["Array", "String", "Tree", "Graph", "DP", "Hash Table", "Binary Search", "Stack", "Sorting"];

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [difficulty, setDifficulty] = useState("");
  const [tag, setTag] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(true), 0);
    listProblems({ difficulty: difficulty || undefined, tags: tag || undefined, page, limit: 50 })
      .then((data) => { setProblems(data.problems); setTotal(data.total); })
      .catch(e => console.warn("Problem fetch failed:", e.message))
      .finally(() => setLoading(false));
    return () => clearTimeout(timer);
  }, [difficulty, tag, page]);

  const filtered = search
    ? problems.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    : problems;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#050505", color: "#fff", position: "relative" }}>
      {/* Interactive Cyber Background */}
      <div style={{
        position: "fixed", inset: 0,
        background: "radial-gradient(circle at 50% 0%, rgba(138,43,226,0.15), transparent 60%), radial-gradient(circle at 100% 100%, rgba(0,255,255,0.08), transparent 50%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
        backgroundSize: "48px 48px", pointerEvents: "none", zIndex: 0,
      }} />

      <Sidebar />
      <main style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 10, padding: "5vh 6vw", fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
        
        {/* Header */}
        <div style={{ marginBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 20 }}>
          <h1 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", margin: "0 0 8px 0", textShadow: "0 0 20px rgba(138,43,226,0.5)" }}>
            Problem Matrix
          </h1>
          <p style={{ color: "#a1a1aa", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", margin: 0 }}>
            {total.toLocaleString()} TARGETS IDENTIFIED <span style={{ color: "#39FF14", margin: "0 8px" }}>{"//"}</span> SELECT AN OPERATIVE MISSION
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Total Targets", value: total.toLocaleString(), color: "#8A2BE2" },
            { label: "Entry Level", value: "~35%", color: "#39FF14" },
            { label: "Extreme Risk", value: "~30%", color: "#ef4444" },
          ].map((stat) => (
            <div key={stat.label} style={{ 
              background: "rgba(20, 20, 25, 0.4)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.05)", borderTop: `1px solid ${stat.color}40`,
              padding: "24px", borderRadius: 16, textAlign: "center",
              boxShadow: "0 4px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: stat.color, textShadow: `0 0 20px ${stat.color}40` }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <label htmlFor="problem-search" style={{ position: "absolute", left: 14, top: -8, background: "#050505", padding: "0 6px", fontSize: 10, color: "#71717a", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", zIndex: 1 }}>Search Matrix</label>
            <input
              id="problem-search"
              aria-label="Search problems"
              placeholder="Filter by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ 
                background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 20px",
                color: "#fff", fontSize: 14, fontFamily: "'JetBrains Mono', monospace", width: 280, outline: "none",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)"
              }}
              onFocus={(e) => e.target.style.borderColor = "#00FFFF"}
              onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {DIFFICULTIES.map((d) => (
              <button key={d || "all"} onClick={() => { setDifficulty(d); setPage(1); }}
                style={{ padding: "8px 20px", borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", border: "1px solid",
                  background: difficulty === d ? "rgba(0,229,255,0.15)" : "rgba(20,20,25,0.6)",
                  color: difficulty === d ? "#00FFFF" : "#a1a1aa",
                  borderColor: difficulty === d ? "#00E5FF" : "rgba(255,255,255,0.1)",
                  textTransform: "uppercase", letterSpacing: "0.1em", transition: "all 0.2s" }}>
                {d || "All"}
              </button>
            ))}
          </div>
        </div>

        {/* Tag filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
          {TAGS.map((t) => (
            <button key={t} onClick={() => { setTag(tag === t ? "" : t); setPage(1); }}
              style={{ padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", border: "1px solid",
                background: tag === t ? "rgba(0,255,255,0.1)" : "transparent",
                color: tag === t ? "#00FFFF" : "#71717a",
                borderColor: tag === t ? "rgba(0,255,255,0.3)" : "rgba(255,255,255,0.05)",
                transition: "all 0.2s" }}>
              {t}
            </button>
          ))}
        </div>

        {/* Problem List */}
        <div style={{
          background: "rgba(20, 20, 25, 0.4)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.05)", borderRadius: 24, overflow: "hidden",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                {["#", "Title", "Difficulty", "Tags", "Action"].map((h) => (
                  <th key={h} style={{ padding: "16px 20px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 60, textAlign: "center", color: "#a1a1aa", fontFamily: "'JetBrains Mono', monospace" }}>SYSTEM SCANNING...</td></tr>
              ) : filtered.map((problem, i) => {
                const diffColors: Record<string, string> = { EASY: "#39FF14", MEDIUM: "#eab308", HARD: "#ef4444" };
                return (
                 <tr key={problem.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)", transition: "background 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "16px 20px", color: "#71717a", fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>{(page - 1) * 50 + i + 1}</td>
                    <td style={{ padding: "16px 20px" }}>
                      <Link href={`/problems/${problem.slug}`} style={{ fontWeight: 700, fontSize: 15, color: "#fff", transition: "color 0.2s" }}
                        onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = "#00FFFF")}
                        onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = "#fff")}>
                        {problem.title.replace(/-/g, " ")}
                      </Link>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{ 
                        fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", padding: "4px 10px", borderRadius: 6,
                        color: diffColors[problem.difficulty.toUpperCase()] || "#fff",
                        border: `1px solid ${diffColors[problem.difficulty.toUpperCase()]}40`,
                        background: `${diffColors[problem.difficulty.toUpperCase()]}15`
                      }}>
                        {problem.difficulty}
                      </span>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {(problem.tags || []).slice(0, 3).map((tag) => (
                          <span key={tag} style={{ fontSize: 10, padding: "3px 8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#a1a1aa", fontFamily: "'JetBrains Mono', monospace" }}>{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <Link href={`/problems/${problem.slug}`}>
                        <button style={{ 
                          padding: "8px 16px", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase",
                          background: "rgba(138,43,226,0.15)", border: "1px solid #8A2BE2", color: "#fff", borderRadius: 8, cursor: "pointer",
                          transition: "all 0.2s", boxShadow: "0 0 10px rgba(138,43,226,0.2)"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#8A2BE2"; e.currentTarget.style.boxShadow = "0 0 20px rgba(138,43,226,0.6)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(138,43,226,0.15)"; e.currentTarget.style.boxShadow = "0 0 10px rgba(138,43,226,0.2)"; }}
                        >
                          Engage
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 32 }}>
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} 
            style={{ padding: "10px 24px", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 8, cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}>← Prev</button>
          <span style={{ padding: "10px 16px", color: "#a1a1aa", fontSize: 12, fontWeight: 800, alignSelf: "center", fontFamily: "'JetBrains Mono', monospace" }}>PAGE {page} / {Math.ceil(total / 50)}</span>
          <button onClick={() => setPage(page + 1)} disabled={page * 50 >= total} 
            style={{ padding: "10px 24px", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", background: "#8A2BE2", border: "1px solid #8A2BE2", color: "#fff", borderRadius: 8, cursor: page * 50 >= total ? "not-allowed" : "pointer", opacity: page * 50 >= total ? 0.5 : 1, boxShadow: "0 4px 15px rgba(138,43,226,0.3)" }}>Next →</button>
        </div>
      </main>
    </div>
  );
}
