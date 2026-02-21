"use client";
import type { TestResult } from "./TestExplorer";

interface PerformancePanelProps {
  testResults: TestResult[];
  totalRuntime?: number | null;
  memory?: number | null;
}

/* ─── SVG Donut Chart ─── */
function DonutChart({ passed, total }: { passed: number; total: number }) {
  if (total === 0) return null;
  const R = 42, C = 2 * Math.PI * R;
  const pct = passed / total;
  const dash = pct * C;
  const gap = C - dash;
  const color = pct === 1 ? "#22c55e" : pct >= 0.5 ? "#eab308" : "#ef4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={110} height={110} viewBox="0 0 100 100">
        {/* Track */}
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
        {/* Arc */}
        <circle
          cx="50" cy="50" r={R} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        {/* Centre text */}
        <text x="50" y="46" textAnchor="middle" fill="#f1f0ff" fontSize="15" fontWeight="700" fontFamily="Space Grotesk, sans-serif">
          {passed}/{total}
        </text>
        <text x="50" y="60" textAnchor="middle" fill={color} fontSize="10" fontFamily="Space Grotesk, sans-serif">
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <span style={{ fontSize: 11, color: "#4a4a6a", textTransform: "uppercase", letterSpacing: "0.06em" }}>Test Pass Rate</span>
    </div>
  );
}

/* ─── Bar chart per-test runtime ─── */
function RuntimeBars({ testResults }: { testResults: TestResult[] }) {
  const runtimes = testResults.map(t => t.runtime ?? 0);
  const max = Math.max(...runtimes, 1);
  const BAR_H = 80;

  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: "#4a4a6a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
        Per-Test Runtime (ms)
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: BAR_H }}>
        {runtimes.map((rt, i) => {
          const h = Math.max(rt > 0 ? (rt / max) * BAR_H : 4, 4);
          const passed = testResults[i].passed;
          const color = passed ? "#22c55e" : "#ef4444";
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 2 }}>
              <span style={{ fontSize: 9, color, fontWeight: 700, whiteSpace: "nowrap" }}>
                {rt > 0 ? `${rt}` : "N/A"}
              </span>
              <div style={{
                width: "100%", height: h, background: color, borderRadius: "3px 3px 0 0",
                opacity: 0.85, transition: "height 0.5s ease",
                minHeight: 4,
              }} />
              <span style={{ fontSize: 9, color: "#4a4a6a" }}>{i + 1}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Verdict distribution mini legend ─── */
function VerdictBreakdown({ testResults }: { testResults: TestResult[] }) {
  const passed = testResults.filter(t => t.passed).length;
  const failed = testResults.filter(t => !t.passed).length;
  const errored = testResults.filter(t => !t.passed && (t.errorDetails || t.stderr || t.compileOutput)).length;

  const items = [
    { label: "Passed", count: passed, color: "#22c55e" },
    { label: "Wrong", count: failed - errored, color: "#ef4444" },
    { label: "Error", count: errored, color: "#f97316" },
  ].filter(x => x.count > 0);

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {items.map(({ label, count, color }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
          <span style={{ fontSize: 12, color: "#8b8ca7" }}>{label} <strong style={{ color }}>{count}</strong></span>
        </div>
      ))}
    </div>
  );
}

export default function PerformancePanel({ testResults, totalRuntime, memory }: PerformancePanelProps) {
  if (!testResults || testResults.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#4a4a6a", fontSize: 14 }}>
        No performance data available.
      </div>
    );
  }

  const passed = testResults.filter(t => t.passed).length;
  const total = testResults.length;
  const hasRuntimes = testResults.some(t => t.runtime != null && t.runtime > 0);
  const avgRuntime = hasRuntimes
    ? Math.round(testResults.filter(t => t.runtime).reduce((s, t) => s + (t.runtime ?? 0), 0) / testResults.filter(t => t.runtime).length)
    : null;

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Top row: donut + stats */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <DonutChart passed={passed} total={total} />

        {/* Stats column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 140 }}>
          <StatRow label="Success Rate" value={total ? `${Math.round((passed / total) * 100)}%` : "—"} color={passed === total ? "#22c55e" : "#eab308"} />
          {avgRuntime != null && <StatRow label="Avg Runtime" value={`${avgRuntime} ms`} color="#a78bfa" />}
          {totalRuntime != null && totalRuntime > 0 && <StatRow label="Total Runtime" value={`${totalRuntime} ms`} color="#60a5fa" />}
          {memory != null && memory > 0 && <StatRow label="Peak Memory" value={`${(memory / 1024).toFixed(1)} MB`} color="#34d399" />}
        </div>
      </div>

      {/* Verdict legend */}
      <VerdictBreakdown testResults={testResults} />

      {/* Bar chart */}
      {hasRuntimes && <RuntimeBars testResults={testResults} />}
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
