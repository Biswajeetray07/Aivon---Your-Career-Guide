"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import ParsedMarkdown from "../ui/ParsedMarkdown";

export type AiPanelMode = "explain-error" | "performance" | "improve";

export interface ErrorExplanation {
  summary: string;
  rootCause: string;
  fixSteps: string[];
  conceptToReview: string;
  likelyIssue?: string;
  debugSteps?: string[];
  edgeCasesToCheck?: string[];
}

export interface PerformanceReview {
  feedback: string;
  timeComplexity: string;
  spaceComplexity: string;
  improvementTip?: string;
  interviewNote?: string;
}

export interface ImproveExplanation {
  feedback: string;
  alternativeApproach: string;
  timeComplexity: string;
  spaceComplexity: string;
}

export interface AiFloatingPanelProps {
  mode: AiPanelMode;
  loading: boolean;
  errorData?: ErrorExplanation | null;
  performanceData?: PerformanceReview | null;
  improveData?: ImproveExplanation | null;
  apiError?: string | null;
  onClose: () => void;
}

const TITLES: Record<AiPanelMode, { icon: string; label: string; color: string }> = {
  "explain-error": { icon: "🚨", label: "DIAGNOSTIC: ERROR",      color: "#FF5F56" },
  performance:     { icon: "⚡", label: "SYS_REVIEW: PERF",  color: "#00E5B0" },
  improve:         { icon: "🔀", label: "ALT_PROTOCOL",        color: "#00C2FF" },
};

export default function AiFloatingPanel({
  mode, loading, errorData, performanceData, improveData, apiError, onClose,
}: AiFloatingPanelProps) {
  const [minimized, setMinimized] = useState(false);
  // pos tracks the full-panel position; minimized chip always renders at fixed top-left dock
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

  // ── Minimized → floating chip ─────────────
  if (minimized) {
    return (
      <div
        style={{
          position: "fixed",
          top: pos.y, left: pos.x,  // respects drag position instead of DOCK
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
        width: 420,
        maxHeight: "75vh",
        background: "#05070A",
        border: `1px solid ${t.color}50`,
        borderRadius: 8,
        boxShadow: `0 20px 50px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.02), inset 0 0 20px ${t.color}10`,
        overflow: "hidden",
        fontFamily: "'Geist Mono', 'Space Grotesk', sans-serif",
        animation: "panelFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <style>{`@keyframes panelFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
      
      {/* Decorative Top Scanline */}
      <div style={{ height: 2, width: '100%', background: `linear-gradient(90deg, transparent, ${t.color}, transparent)` }} />

      {/* Header — draggable */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px",
          background: `url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiAvPgo8L3N2Zz4='), linear-gradient(135deg, ${t.color}15, transparent)`,
          borderBottom: `1px solid ${t.color}20`,
          cursor: "grab", userSelect: "none",
        }}
      >
        <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 2, background: `${t.color}20`, border: `1px solid ${t.color}50`, color: t.color }}>{t.icon}</span>
        <span style={{ fontSize: 12, letterSpacing: '0.15em', fontWeight: 800, color: t.color, flex: 1, textTransform: 'uppercase' }}>{t.label}</span>
        <button onClick={() => setMinimized(true)} style={headerBtn} title="Minimize">_</button>
        <button onClick={onClose} style={headerBtn} title="Close">✕</button>
      </div>

      {/* Body */}
      <div style={{ padding: "20px", overflowY: "auto", maxHeight: "calc(75vh - 54px)", display: "flex", flexDirection: "column", gap: 16 }}>
        {loading && <LoadingDots color={t.color} />}

        {!loading && apiError && (
          <div style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Generation Failed</div>
            <div style={{ fontSize: 13, color: "#fca5a5" }}>{apiError}</div>
          </div>
        )}

        {!loading && !apiError && mode === "explain-error" && errorData && (
          <ErrorContent data={errorData} />
        )}

        {!loading && !apiError && mode === "performance" && performanceData && (
          <PerformanceContent data={performanceData} />
        )}

        {!loading && !apiError && mode === "improve" && improveData && (
          <ImproveContent data={improveData} />
        )}

        {!loading && !apiError && !errorData && !performanceData && !improveData && (
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      
      {/* Main Diagnostic */}
      <div style={{
        background: "#060D10", 
        border: "1px solid #FF5F5640",
        borderLeft: "3px solid #FF5F56",
        borderRadius: 4, padding: "14px 16px",
        position: "relative",
      }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 20, height: 20, background: "linear-gradient(225deg, #FF5F5640 50%, transparent 50%)" }} />
        <div style={{ fontSize: 10, fontWeight: 800, color: "#FF5F56", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.15em" }}>
          SYS.DIAGNOSTIC // {isWA ? "LOGIC_FAILURE" : "EXEC_CRASH"}
        </div>
        <div style={{ fontSize: 13, color: "#fff", lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "var(--font-geist-mono)" }}>
          {data.summary}
        </div>
      </div>

      {/* Root Cause / Issue */}
      <div>
        <SectionLabel color="#00C2FF">► {isWA ? "IDENTIFIED_ANOMALY" : "ROOT_CAUSE"}</SectionLabel>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, paddingLeft: 12, borderLeft: "1px dashed #00C2FF50" }}>
          {data.likelyIssue ?? data.rootCause}
        </div>
      </div>

      {/* Steps to Fix */}
      <div>
        <SectionLabel color="#00E5B0">► RECOMMENDED_OVERRIDE</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "#060D10", padding: "10px", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 4 }}>
              <span style={{
                flexShrink: 0, color: "#00E5B0", fontSize: 10, fontWeight: 800, marginTop: 2,
              }}>[0{i + 1}]</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Edge Cases */}
      {isWA && data.edgeCasesToCheck && data.edgeCasesToCheck.length > 0 && (
        <div>
          <SectionLabel color="#FFB000">► EDGE_CASES</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.edgeCasesToCheck.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 8, fontSize: 12 }}>
                <span style={{ color: "#FFB000" }}>--&gt;</span>
                <span style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concept Focus */}
      <div style={{
        background: "#060D10", border: "1px dashed #00C2FF50",
        borderRadius: 4, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ width: 6, height: 6, background: "#00C2FF", animation: "pulse 2s infinite" }} />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>REQ_KNOWLEDGE : <strong style={{color: "#00C2FF"}}>{data.conceptToReview}</strong></span>
      </div>
    </div>
  );
}

function PerformanceContent({ data }: { data: PerformanceReview }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <ComplexityBadge label="TIME_COMPLEXITY" value={data.timeComplexity} color="#00C2FF" />
        <ComplexityBadge label="SPACE_COMPLEXITY" value={data.spaceComplexity} color="#00E5B0" />
      </div>
      
      <div>
        <SectionLabel color="#00E5B0">► SYSTEM_ANALYSIS</SectionLabel>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, whiteSpace: "pre-wrap", borderLeft: "1px solid #00E5B030", paddingLeft: 12 }}>
          {data.feedback}
        </div>
      </div>
      
      {data.improvementTip && (
        <div style={{ background: "#060D10", border: "1px solid #FFB00040", borderLeft: "3px solid #FFB000", borderRadius: 4, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#FFB000", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.15em" }}>{"// OPTIMIZATION_TIP"}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>{data.improvementTip}</div>
        </div>
      )}
      
      {data.interviewNote && (
        <div style={{ background: "transparent", border: "1px dashed #00C2FF40", borderRadius: 4, padding: "8px 12px" }}>
          <span style={{ fontSize: 11, color: "#00C2FF", letterSpacing: "0.05em", textTransform: "uppercase" }}>[ TARGET_NOTE: {data.interviewNote} ]</span>
        </div>
      )}
    </div>
  );
}

function ImproveContent({ data }: { data: ImproveExplanation }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      
      <div>
         <SectionLabel color="#00C2FF">► CURRENT_STATE_ASSESSMENT</SectionLabel>
         <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, whiteSpace: "pre-wrap", borderLeft: "1px solid #00C2FF30", paddingLeft: 12 }}>
           {data.feedback}
         </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <ComplexityBadge label="OPTIMAL_TIME" value={data.timeComplexity ?? "?"} color="#00C2FF" />
        <ComplexityBadge label="OPTIMAL_SPACE" value={data.spaceComplexity ?? "?"} color="#00E5B0" />
      </div>
      
      <div style={{
        background: "#060D10", 
        border: "1px solid #00E5B030",
        borderTop: "3px solid #00E5B0",
        borderRadius: 4, padding: "16px",
        position: "relative"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ width: 8, height: 8, background: "#00E5B0", borderRadius: "1px" }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: "#00E5B0", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            ALTERNATIVE_PROTOCOL
          </span>
        </div>
        <div className="prose prose-invert prose-p:text-sm prose-pre:bg-[#0A0F14] prose-pre:border prose-pre:border-white/10 prose-code:text-[#00C2FF] max-w-none">
          <ParsedMarkdown text={data.alternativeApproach} />
        </div>
      </div>

    </div>
  );
}

function ComplexityBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "12px 8px", background: "#060D10", border: `1px solid ${color}30`, borderRadius: 4, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace", textShadow: `0 0 10px ${color}50` }}>{value}</div>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700 }}>{label}</div>
    </div>
  );
}

function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 800, color, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "var(--font-geist-mono)" }}>
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
