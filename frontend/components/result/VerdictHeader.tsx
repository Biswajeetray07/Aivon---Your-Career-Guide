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
  ACCEPTED:                    { label: "SYS.VERDICT // ACCEPTED",            color: "#00E5B0", bg: "#060D10",    emoji: "🚀" },
  WRONG_ANSWER:                { label: "SYS.VERDICT // WRONG_ANSWER",        color: "#FF5F56", bg: "#060D10",   emoji: "❌" },
  WRONG_ANSWER_ON_HIDDEN_TEST: { label: "SYS.VERDICT // REJECTED_HIDDEN",     color: "#FF5F56", bg: "#060D10",   emoji: "🕵️‍♂️" },
  TIME_LIMIT_EXCEEDED:         { label: "SYS.VERDICT // TIME_LIMIT",          color: "#FFB000", bg: "#060D10",   emoji: "⏱️" },
  MEMORY_LIMIT_EXCEEDED:       { label: "SYS.VERDICT // MEMORY_OVERFLOW",     color: "#FFB000", bg: "#060D10",   emoji: "🧠" },
  COMPILATION_ERROR:           { label: "SYS.VERDICT // COMPILE_FAIL",        color: "#FF5F56", bg: "#060D10",   emoji: "🔴" },
  RUNTIME_ERROR:               { label: "SYS.VERDICT // RUNTIME_CRASH",       color: "#FF5F56", bg: "#060D10",  emoji: "💥" },
  INTERNAL_ERROR:              { label: "SYS.VERDICT // INTERNAL_FAULT",      color: "#6b7280", bg: "#060D10", emoji: "⚠️" },
  ERROR:                       { label: "SYS.VERDICT // ERROR",               color: "#6b7280", bg: "#060D10", emoji: "⚠️" },
  PENDING:                     { label: "SYS.STATUS // SCHEDULED",            color: "#00C2FF", bg: "#060D10",   emoji: "⌛" },
  QUEUED:                      { label: "SYS.STATUS // QUEUED",               color: "#00C2FF", bg: "#060D10",   emoji: "⌛" },
  RUNNING:                     { label: "SYS.STATUS // EXECUTING",            color: "#00C2FF", bg: "#060D10",   emoji: "🔄" },
  REQUEST_ERROR:               { label: "SYS.VERDICT // CONNECTION_LOST",     color: "#6b7280", bg: "#060D10", emoji: "⚠️" },
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
      borderBottom: `1px solid ${v.color}20`,
      borderLeft: `3px solid ${v.color}`,
      transition: "all 0.3s",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      position: "relative",
    }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(90deg, transparent, ${v.color}05 50%, transparent)`, pointerEvents: "none" }} />
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{
          fontSize: 14, fontWeight: 800, margin: 0,
          color: v.color, display: "flex", alignItems: "center", gap: 10,
          letterSpacing: "0.15em", textTransform: "uppercase",
        }}>
          <span style={{ fontSize: 18 }}>{v.emoji}</span>
          <span>{v.label}</span>
          {!done && (
            <div style={{ color: v.color, display: "flex", alignItems: "center", marginLeft: 8 }}>
              <span className="typing-cursor ml-1"></span>
            </div>
          )}
        </h2>

        {/* Stats pills — moved to its own row below for better top-down scanning */}
      </div>

      {done ? (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", animation: "panelFadeIn var(--transition-fast)", position: "relative", zIndex: 10 }}>
          {passedCases !== undefined && totalCases !== undefined && (
            <DataBlock
              value={`${passedCases} / ${totalCases}`}
              label={mode === "run" ? "SAMPLES_PASSED" : "TESTS_CLEARED"}
              color={passedCases === totalCases ? "#00E5B0" : "#FF5F56"}
            />
          )}
          {runtime != null && (
            <DataBlock value={`${runtime} ms`} label="EXECUTION_TIME" color="#00C2FF" />
          )}
          {memory != null && (
            <DataBlock value={`${(memory / 1024).toFixed(1)} MB`} label="MEMORY_ALLOC" color="#00C2FF" />
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

function DataBlock({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "flex-start",
      background: "transparent", border: `1px solid ${color}30`,
      borderLeft: `3px solid ${color}`,
      padding: "8px 12px", minWidth: 100,
    }}>
      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 800, color }}>{value}</span>
    </div>
  );
}
