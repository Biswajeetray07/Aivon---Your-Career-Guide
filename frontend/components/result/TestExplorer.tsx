"use client";
import { useState } from "react";

export interface TestResult {
  input: string;
  expected: string;
  actual: string | null;
  stdout?: string | null;
  stderr?: string | null;
  compileOutput?: string | null;
  passed: boolean;
  runtime?: number | null;
  errorDetails?: {
    verdict: string;
    errorType: string;
    line: number | null;
    message: string;
  } | null;
}

interface TestExplorerProps {
  testResults: TestResult[];
  mode?: "run" | "submit";
  /** For submit mode, index >= this value means hidden test */
  visibleCount?: number;
}

type Tab = "detail" | "console";

const CODE_BG = "rgba(0,0,0,0.28)";

export default function TestExplorer({ testResults, mode, visibleCount }: TestExplorerProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [tab, setTab] = useState<Tab>("detail");

  if (!testResults || testResults.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#4a4a6a", fontSize: 14 }}>
        No test results yet.
      </div>
    );
  }

  const active = testResults[activeIdx];
  const isHidden = mode === "submit" && visibleCount !== undefined && activeIdx >= visibleCount;
  const hasError = !!(active.errorDetails || active.stderr || active.compileOutput);
  const hasConsole = !!(active.compileOutput || active.stderr);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Case pill row */}
      <div style={{
        display: "flex", gap: 6, padding: "12px 20px",
        overflowX: "auto", borderBottom: "1px solid rgba(255,255,255,0.06)",
        scrollbarWidth: "none",
      }}>
        {testResults.map((tr, i) => {
          const hidden = mode === "submit" && visibleCount !== undefined && i >= visibleCount;
          return (
            <button
              key={i}
              onClick={() => { setActiveIdx(i); setTab("detail"); }}
              style={{
                flexShrink: 0, padding: "4px 12px", borderRadius: 16, fontSize: 11, fontWeight: 700,
                fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap",
                background: activeIdx === i
                  ? (tr.passed ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)")
                  : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${activeIdx === i
                  ? (tr.passed ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)")
                  : "rgba(255,255,255,0.08)"}`,
                color: tr.passed ? "#22c55e" : "#ef4444",
                transition: "all var(--transition-fast)",
              }}
              onMouseEnter={e => { if (activeIdx !== i) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { if (activeIdx !== i) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            >
              {tr.passed ? "🟢" : "🔴"} Case {i + 1}
              {tr.runtime != null && (
                <span style={{ marginLeft: 6, opacity: 0.7, fontWeight: 500, fontSize: 11 }}>
                  {tr.runtime}ms
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-tabs */}
      <div style={{
        display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 20px", gap: 12,
      }}>
        {(["detail", "console"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 14px", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
              cursor: "pointer", border: "none", background: "transparent",
              color: tab === t ? "#f1f0ff" : "#6b7280",
              borderBottom: tab === t ? "2px solid #7c3aed" : "2px solid transparent",
              transition: "all var(--transition-fast)",
            }}
            onMouseEnter={e => { if (tab !== t) e.currentTarget.style.color = "#d1d5db"; }}
            onMouseLeave={e => { if (tab !== t) e.currentTarget.style.color = "#6b7280"; }}
          >
            {t === "detail" ? "Test Detail" : `Console${hasConsole ? " !" : ""}`}
          </button>
        ))}
        {active.runtime != null && (
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", fontSize: 11, color: "#4a4a6a" }}>
            ⏱ {active.runtime} ms
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {tab === "detail" && (
          <>
            {/* Error badge */}
            {hasError && (
              <div style={{
                background: "rgba(239,68,68,0.07)", padding: "10px 12px",
                borderRadius: 6, border: "1px solid rgba(239,68,68,0.22)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: active.errorDetails?.message ? 6 : 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#f97316" }}>
                    {active.errorDetails?.verdict ?? (active.compileOutput ? "Compile Error" : "Runtime Error")}
                  </span>
                  {active.errorDetails?.errorType && (
                    <span style={{
                      fontSize: 11, padding: "2px 8px",
                      background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.35)",
                      borderRadius: 12, color: "#fca5a5", fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {active.errorDetails.errorType}
                    </span>
                  )}
                  {active.errorDetails?.line != null && (
                    <span style={{ fontSize: 11, color: "#6b7280" }}>Line {active.errorDetails.line}</span>
                  )}
                </div>
                {active.errorDetails?.message && (
                  <pre style={{
                    fontSize: 12, color: "#fca5a5", fontFamily: "'JetBrains Mono', monospace",
                    background: "rgba(0,0,0,0.25)", padding: "8px 10px", borderRadius: 6,
                    whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0,
                  }}>
                    {active.errorDetails.message}
                  </pre>
                )}
              </div>
            )}

            {/* Input */}
            <Field label="Input" hidden={isHidden}>
              {isHidden ? "🔒 Hidden test case" : active.input}
            </Field>

            {/* Stdout */}
            {active.stdout && !isHidden && (
              <Field label="Stdout">{active.stdout}</Field>
            )}

            {/* Your Output */}
            <div>
              <Label color={active.passed ? "#22c55e" : "#ef4444"}>
                {active.passed ? "Output ✓" : "Your Output ✗"}
              </Label>
              <div style={{
                background: active.passed ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)",
                border: `1px solid ${active.passed ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
                padding: "10px 14px", borderRadius: 6, fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1.5,
                color: active.passed ? "#22c55e" : "#ef4444",
                whiteSpace: "pre-wrap", wordBreak: "break-all",
                transition: "background var(--transition-fast)",
              }}
              onMouseEnter={e => e.currentTarget.style.background = active.passed ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = active.passed ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)"}
              >
                {active.actual !== null && active.actual !== undefined ? active.actual : "(no output)"}
              </div>
            </div>

            {/* Expected */}
            {!isHidden && (
              <div>
                <Label color="#22c55e">Expected</Label>
                <div style={{
                  background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.12)",
                  padding: "10px 14px", borderRadius: 6, fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace", color: "#22c55e",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap", wordBreak: "break-all",
                  transition: "background var(--transition-fast)",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(34,197,94,0.07)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(34,197,94,0.04)"}
                >
                  {active.expected}
                </div>
              </div>
            )}
          </>
        )}

        {tab === "console" && (
          <>
            {active.compileOutput && (
              <div>
                <Label color="#eab308">Compile Output</Label>
                <pre style={{
                  background: "rgba(234,179,8,0.05)", padding: 10, borderRadius: 7, fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace", color: "#fbbf24",
                  overflowX: "auto", margin: 0, whiteSpace: "pre-wrap",
                }}>{active.compileOutput}</pre>
              </div>
            )}
            {active.stderr && (
              <div>
                <Label color="#ef4444">Standard Error</Label>
                <pre style={{
                  background: "rgba(239,68,68,0.05)", padding: 10, borderRadius: 7, fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace", color: "#fca5a5",
                  overflowX: "auto", margin: 0, whiteSpace: "pre-wrap",
                }}>{active.stderr}</pre>
              </div>
            )}
            {!active.compileOutput && !active.stderr && (
              <div style={{ textAlign: "center", color: "#4a4a6a", fontSize: 13, marginTop: 20, fontFamily: "'JetBrains Mono', monospace" }}>
                No console output.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Label({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color, marginBottom: 4,
      textTransform: "uppercase", letterSpacing: "0.08em",
    }}>
      {children}
    </div>
  );
}

function Field({ label, children, hidden }: { label: string; children: React.ReactNode; hidden?: boolean }) {
  return (
    <div>
      <Label color="#4a4a6a">{label}</Label>
      <div style={{
        background: hidden ? "rgba(255,255,255,0.02)" : CODE_BG,
        padding: "10px 14px", borderRadius: 6, fontSize: 13,
        fontFamily: "'JetBrains Mono', monospace", color: hidden ? "#6b7280" : "#9ca3af",
        lineHeight: 1.5,
        whiteSpace: "pre-wrap", wordBreak: "break-all",
        border: hidden ? "1px dashed rgba(255,255,255,0.06)" : "1px solid transparent",
        transition: "background var(--transition-fast)",
      }}
      onMouseEnter={e => { if (!hidden) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={e => { if (!hidden) e.currentTarget.style.background = CODE_BG; }}
      >
        {children}
      </div>
    </div>
  );
}
