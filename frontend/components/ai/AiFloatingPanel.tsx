"use client";
import { useState, useRef, useEffect, useCallback } from "react";

export type AiPanelMode = "explain-error" | "performance" | "improve";

export interface ErrorExplanation {
  summary: string;
  rootCause: string;
  fixSteps: string[];
  conceptToReview: string;
  likelyIssue?: string;
  whyItHappens?: string;
  debugSteps?: string[];
  edgeCasesToCheck?: string[];
}

export interface PerformanceReview {
  feedback: string;
  timeComplexity: string;
  spaceComplexity: string;
  isOptimal?: boolean;
  improvementTip?: string;
  interviewNote?: string;
}

interface AiFloatingPanelProps {
  mode: AiPanelMode;
  loading: boolean;
  errorData?: ErrorExplanation | null;
  performanceData?: PerformanceReview | null;
  improveData?: string | null;
  onClose: () => void;
}

const TITLES: Record<AiPanelMode, { icon: string; label: string; color: string }> = {
  "explain-error": { icon: "✨", label: "Error Analysis",      color: "#f97316" },
  performance:     { icon: "📊", label: "Performance Review",  color: "#22c55e" },
  improve:         { icon: "🔀", label: "Alt Approach",        color: "#a78bfa" },
};

export default function AiFloatingPanel({
  mode, loading, errorData, performanceData, improveData, onClose,
}: AiFloatingPanelProps) {
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: 20, y: 80 });
  const dragRef = useRef<{ dragging: boolean; sx: number; sy: number }>({ dragging: false, sx: 0, sy: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { dragging: true, sx: e.clientX - pos.x, sy: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      setPos({ x: e.clientX - dragRef.current.sx, y: e.clientY - dragRef.current.sy });
    };
    const onUp = () => { dragRef.current.dragging = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const t = TITLES[mode];

  // ── Minimized → dock to top-left as a modern chip ─────────────────────
  if (minimized) {
    return (
      <div
        style={{
          position: "fixed",
          top: pos.y, left: pos.x,
          zIndex: 9999,
          height: 36,
          background: "rgba(15,15,25,0.97)",
          border: `1px solid ${t.color}50`,
          borderRadius: 18,
          backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", gap: 8,
          padding: "0 6px 0 14px",
          boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)`,
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          transition: "box-shadow 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          transformOrigin: "center",
          animation: "panelFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <style>{`@keyframes panelFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
        
        {/* Draggable & clickable area */}
        <div
          onMouseDown={onMouseDown}
          onClick={() => setMinimized(false)}
          title="Click to restore, drag to move"
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "grab", flex: 1, paddingRight: 4 }}
          onMouseEnter={(e) => (e.currentTarget.parentElement!.style.transform = "scale(1.02)")}
          onMouseLeave={(e) => (e.currentTarget.parentElement!.style.transform = "scale(1)")}
        >
          <span style={{ fontSize: 13 }}>{t.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: t.color }}>{t.label}</span>
        </div>

        {/* Close button inside minimized chip */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          title="Close AI Assistant"
          style={{
            ...headerBtn,
            width: 24, height: 24, borderRadius: 12,
            background: "transparent", color: "#9ca3af",
            fontSize: 11
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#f3f4f6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#9ca3af"; }}
        >✕</button>
      </div>
    );
  }

  // ── Expanded floating panel ──────────────────────────────────────────────────
  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed", left: pos.x, top: pos.y, zIndex: 9999,
        width: 380,
        maxHeight: "75vh",
        background: "rgba(15, 15, 25, 0.97)",
        border: `1px solid ${t.color}40`,
        borderRadius: 16,
        boxShadow: `0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.05)`,
        backdropFilter: "blur(12px)",
        overflow: "hidden",
        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
        animation: "panelFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <style>{`@keyframes panelFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
      {/* Header — draggable */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px",
          background: `linear-gradient(135deg, ${t.color}15, transparent)`,
          borderBottom: `1px solid ${t.color}20`,
          cursor: "grab", userSelect: "none",
        }}
      >
        <span style={{ fontSize: 15 }}>{t.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: t.color, flex: 1 }}>{t.label}</span>
        <button onClick={() => setMinimized(true)} style={headerBtn} title="Minimize to dock">▼</button>
        <button onClick={onClose} style={headerBtn} title="Close">✕</button>
      </div>

      {/* Body */}
      <div style={{ padding: "20px", overflowY: "auto", maxHeight: "calc(75vh - 54px)", display: "flex", flexDirection: "column", gap: 16 }}>
        {loading && <LoadingDots color={t.color} />}

        {!loading && mode === "explain-error" && errorData && (
          <ErrorContent data={errorData} />
        )}

        {!loading && mode === "performance" && performanceData && (
          <PerformanceContent data={performanceData} />
        )}

        {!loading && mode === "improve" && improveData && (
          <ImproveContent text={improveData} />
        )}

        {!loading && !errorData && !performanceData && !improveData && (
          <div style={{ color: "#4a4a6a", fontSize: 13, textAlign: "center", padding: 20 }}>
            No data available.
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function ErrorContent({ data }: { data: ErrorExplanation }) {
  const isWA = !!(data.likelyIssue || data.debugSteps || data.edgeCasesToCheck);
  const steps = data.debugSteps ?? data.fixSteps;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{
        background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)",
        borderRadius: 10, padding: "10px 14px",
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f97316", marginBottom: 4 }}>
          {isWA ? "Why Your Output is Wrong" : "What happened"}
        </div>
        <div style={{ fontSize: 13, color: "#e0e0e0", lineHeight: 1.6 }}>{data.summary}</div>
      </div>

      <div>
        <SectionLabel color="#ef4444">{isWA ? "Likely Issue" : "Root Cause"}</SectionLabel>
        <div style={{ fontSize: 13, color: "#c0c0d0", lineHeight: 1.6 }}>
          {data.likelyIssue ?? data.rootCause}
        </div>
      </div>

      <div>
        <SectionLabel color="#22c55e">{isWA ? "Debug Steps" : "How to Fix"}</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{
                flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
                background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#22c55e",
              }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: "#c0c0d0", lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {isWA && data.edgeCasesToCheck && data.edgeCasesToCheck.length > 0 && (
        <div>
          <SectionLabel color="#60a5fa">Edge Cases to Test</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.edgeCasesToCheck.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "#60a5fa", fontSize: 13 }}>→</span>
                <span style={{ fontSize: 13, color: "#c0c0d0", lineHeight: 1.5 }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
        borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 14 }}>📚</span>
        <span style={{ fontSize: 12, color: "#a78bfa" }}>Review: <strong>{data.conceptToReview}</strong></span>
      </div>
    </div>
  );
}

function PerformanceContent({ data }: { data: PerformanceReview }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <ComplexityBadge label="Time" value={data.timeComplexity} color="#60a5fa" />
        <ComplexityBadge label="Space" value={data.spaceComplexity} color="#34d399" />
      </div>
      <div>
        <SectionLabel color="#22c55e">Analysis</SectionLabel>
        <div style={{ fontSize: 13, color: "#c0c0d0", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{data.feedback}</div>
      </div>
      {data.improvementTip && (
        <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#eab308", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>💡 Tip</div>
          <div style={{ fontSize: 13, color: "#c0c0d0", lineHeight: 1.5 }}>{data.improvementTip}</div>
        </div>
      )}
      {data.interviewNote && (
        <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 8, padding: "8px 12px" }}>
          <span style={{ fontSize: 12, color: "#a78bfa" }}>🎯 {data.interviewNote}</span>
        </div>
      )}
    </div>
  );
}

function ImproveContent({ text }: { text: string }) {
  return <div style={{ fontSize: 13, color: "#c0c0d0", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{text}</div>;
}

function ComplexityBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "10px 8px", background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 10 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 10, color: "#6b7280", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
    </div>
  );
}

function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {children}
    </div>
  );
}

function LoadingDots({ color }: { color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 24, gap: 6 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%", background: color, opacity: 0.5,
          animation: `aiPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`@keyframes aiPulse { 0%,80%,100%{opacity:0.3;transform:scale(0.8);} 40%{opacity:1;transform:scale(1.2);} }`}</style>
    </div>
  );
}

const headerBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 6,
  width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
  color: "#6b7280", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
};
