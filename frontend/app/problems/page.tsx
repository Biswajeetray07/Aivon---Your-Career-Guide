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
    setLoading(true);
    listProblems({ difficulty: difficulty || undefined, tags: tag || undefined, page, limit: 50 })
      .then((data) => { setProblems(data.problems); setTotal(data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [difficulty, tag, page]);

  const filtered = search
    ? problems.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    : problems;

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            Problem Set
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            {total.toLocaleString()} problems from the LeetCode dataset · AI-powered hints & feedback
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Total Problems", value: total.toLocaleString(), color: "var(--accent-purple-light)" },
            { label: "Easy", value: "~35%", color: "var(--green)" },
            { label: "Hard", value: "~30%", color: "var(--red)" },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <input
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 16px", color: "var(--text-primary)", fontSize: 14, fontFamily: "inherit", width: 250, outline: "none" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            {DIFFICULTIES.map((d) => (
              <button key={d || "all"} onClick={() => { setDifficulty(d); setPage(1); }}
                style={{ padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid",
                  background: difficulty === d ? "rgba(124,58,237,0.2)" : "transparent",
                  color: difficulty === d ? "var(--accent-purple-light)" : "var(--text-secondary)",
                  borderColor: difficulty === d ? "var(--accent-purple)" : "var(--border)" }}>
                {d || "All"}
              </button>
            ))}
          </div>
        </div>

        {/* Tag filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {TAGS.map((t) => (
            <button key={t} onClick={() => { setTag(tag === t ? "" : t); setPage(1); }}
              style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", border: "1px solid",
                background: tag === t ? "rgba(124,58,237,0.15)" : "transparent",
                color: tag === t ? "var(--accent-purple-light)" : "var(--text-muted)",
                borderColor: tag === t ? "var(--accent-purple)" : "var(--border)" }}>
              {t}
            </button>
          ))}
        </div>

        {/* Problem List */}
        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["#", "Title", "Difficulty", "Tags", "Action"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>Loading problems...</td></tr>
              ) : filtered.map((problem, i) => (
                <tr key={problem.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.15s", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "14px 16px", color: "var(--text-muted)", fontSize: 13 }}>{(page - 1) * 50 + i + 1}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <Link href={`/problems/${problem.slug}`} style={{ fontWeight: 500, fontSize: 14, color: "var(--text-primary)", transition: "color 0.15s" }}
                      onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = "var(--accent-purple-light)")}
                      onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = "var(--text-primary)")}>
                      {problem.title.replace(/-/g, " ")}
                    </Link>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span className={`badge-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {(problem.tags || []).slice(0, 2).map((tag) => (
                        <span key={tag} style={{ fontSize: 11, padding: "2px 8px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text-muted)" }}>{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <Link href={`/problems/${problem.slug}`}>
                      <button className="btn-primary" style={{ padding: "5px 14px", fontSize: 12 }}>Solve</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary" style={{ padding: "8px 20px", fontSize: 13 }}>← Prev</button>
          <span style={{ padding: "8px 16px", color: "var(--text-secondary)", fontSize: 13, alignSelf: "center" }}>Page {page} of {Math.ceil(total / 50)}</span>
          <button onClick={() => setPage(page + 1)} disabled={page * 50 >= total} className="btn-primary" style={{ padding: "8px 20px", fontSize: 13 }}>Next →</button>
        </div>
      </main>
    </div>
  );
}
