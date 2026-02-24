"use client";

export type VerdictStatus =
  | "ACCEPTED" | "WRONG_ANSWER" | "TIME_LIMIT_EXCEEDED" | "MEMORY_LIMIT_EXCEEDED"
  | "COMPILATION_ERROR" | "RUNTIME_ERROR" | "INTERNAL_ERROR" | "WRONG_ANSWER_ON_HIDDEN_TEST"
  | "PENDING" | "QUEUED" | "RUNNING" | "REQUEST_ERROR" | "ERROR";

interface VerdictHeaderProps {
  status: string;
  runtime?: number | null;
  memory?: number | null;
  passedCases?: number;
  totalCases?: number;
  progressCurrent?: number;
  progressTotal?: number;
  progressMessage?: string;
  mode?: "run" | "submit";
}

const VERDICTS: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  ACCEPTED:                    { label: "Accepted",            color: "#22c55e", bg: "rgba(34,197,94,0.1)",    emoji: "✅" },
  WRONG_ANSWER:                { label: "Wrong Answer",        color: "#ef4444", bg: "rgba(239,68,68,0.1)",   emoji: "❌" },
  WRONG_ANSWER_ON_HIDDEN_TEST: { label: "Hidden Test Failed",  color: "#f43f5e", bg: "rgba(244,63,94,0.1)",   emoji: "🕵️‍♂️" },
  TIME_LIMIT_EXCEEDED:         { label: "Time Limit Exceeded", color: "#eab308", bg: "rgba(234,179,8,0.1)",   emoji: "⏱️" },
  MEMORY_LIMIT_EXCEEDED:       { label: "Memory Limit Exceeded", color: "#eab308", bg: "rgba(234,179,8,0.1)",   emoji: "🧠" },
  COMPILATION_ERROR:           { label: "Compile Error",       color: "#ef4444", bg: "rgba(239,68,68,0.1)",   emoji: "🔴" },
  RUNTIME_ERROR:               { label: "Runtime Error",       color: "#f97316", bg: "rgba(249,115,22,0.1)",  emoji: "💥" },
  INTERNAL_ERROR:        { label: "Internal Error",        color: "#6b7280", bg: "rgba(107,114,128,0.1)", emoji: "⚠️" },
  ERROR:                 { label: "Error",                 color: "#6b7280", bg: "rgba(107,114,128,0.1)", emoji: "⚠️" },
  PENDING:               { label: "Queued…",              color: "#3b82f6", bg: "rgba(59,130,246,0.1)",   emoji: "⌛" },
  QUEUED:                { label: "Queued…",              color: "#3b82f6", bg: "rgba(59,130,246,0.1)",   emoji: "⌛" },
  RUNNING:               { label: "Running…",             color: "#3b82f6", bg: "rgba(59,130,246,0.1)",   emoji: "🔄" },
  REQUEST_ERROR:         { label: "Request Error",         color: "#6b7280", bg: "rgba(107,114,128,0.1)", emoji: "⚠️" },
};

function getVerdict(status: string) {
  const normalizedStatus = status.toUpperCase().replace(/\s/g, "_");
  return VERDICTS[normalizedStatus] ?? {
    label: status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
    color: "#ef4444", bg: "rgba(239,68,68,0.1)", emoji: "❌",
  };
}

const isTerminal = (s: string) => {
  const norm = s.toUpperCase().replace(/\s/g, "_");
  return !["PENDING", "QUEUED", "RUNNING"].includes(norm);
}

export default function VerdictHeader({
  status, runtime, memory, passedCases, totalCases,
  progressCurrent, progressTotal, progressMessage, mode,
}: VerdictHeaderProps) {
  const v = getVerdict(status);
  const done = isTerminal(status);
  const pct = progressTotal ? Math.round(((progressCurrent ?? 0) / progressTotal) * 100) : 0;

  return (
    <div style={{
      padding: "16px 20px",
      background: v.bg,
      borderBottom: `1px solid ${v.color}25`,
      transition: "all 0.3s",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{
          fontSize: 17, fontWeight: 800, margin: 0,
          color: v.color, display: "flex", alignItems: "center", gap: 8,
          letterSpacing: "-0.3px",
        }}>
          <span>{v.emoji}</span>
          <span>{v.label}</span>
          {!done && (
            <svg style={{ width: 18, height: 18, animation: "spin 0.9s linear infinite" }}
              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke={v.color} strokeWidth="3" strokeOpacity="0.25"/>
              <path fill={v.color} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          )}
        </h2>

        {/* Stats pills — moved to its own row below for better top-down scanning */}
      </div>

      {done ? (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", animation: "panelFadeIn var(--transition-fast)" }}>
          {passedCases !== undefined && totalCases !== undefined && (
            <Pill
              value={`${passedCases} / ${totalCases}`}
              label={mode === "run" ? "samples" : "tests"}
              color={passedCases === totalCases ? "#22c55e" : "#ef4444"}
            />
          )}
          {runtime != null && (
            <Pill value={`${runtime} ms`} label="runtime" color="#00FFFF" />
          )}
          {memory != null && (
            <Pill value={`${(memory / 1024).toFixed(1)} MB`} label="memory" color="#60a5fa" />
          )}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[1,2,3].map(i => (
             <div key={i} style={{ 
               width: 70, height: 44, borderRadius: 10, 
               background: "rgba(255,255,255,0.03)", 
               overflow: "hidden", position: "relative" 
             }}>
               <div style={{ 
                 position: "absolute", top: 0, left: "-100%", width: "50%", height: "100%", 
                 background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)", 
                 animation: "shimmerSlide 1.5s infinite" 
               }} />
             </div>
          ))}
        </div>
      )}

      {/* Progress bar — RUNNING state */}
      {!done && (progressTotal ?? 0) > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, color: "#8b8ca7" }}>
            <span>{progressMessage || "Running test cases…"}</span>
            <span>{progressCurrent ?? 0} / {progressTotal}</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${pct}%`, borderRadius: 99,
              background: `linear-gradient(90deg, #00E5FF, #3b82f6)`,
              transition: "width 300ms cubic-bezier(0.2, 0.8, 0.2, 1)",
              boxShadow: "0 0 8px rgba(124,58,237,0.6)",
            }} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmerSlide { 100% { transform: translateX(400%); } }
      `}</style>
    </div>
  );
}

function Pill({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 8, padding: "4px 10px", minWidth: 60,
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{label}</span>
    </div>
  );
}
