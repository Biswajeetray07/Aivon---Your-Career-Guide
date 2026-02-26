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
  /** Optional controlled active index (for failure-first selection from parent) */
  activeIndex?: number;
  onSelect?: (idx: number) => void;
}

type Tab = "detail" | "console";

const CODE_BG = "#060D10";

export default function TestExplorer({ testResults, mode, visibleCount, activeIndex, onSelect }: TestExplorerProps) {
  const [internalIdx, setInternalIdx] = useState(0);
  const [tab, setTab] = useState<Tab>("detail");
  // Use controlled index if provided, else internal
  const activeIdx = activeIndex !== undefined ? activeIndex : internalIdx;
  const setActiveIdx = (i: number) => { setInternalIdx(i); onSelect?.(i); };

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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
      <style>{`
        .test-cases-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .test-cases-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .test-cases-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
        }
        .test-cases-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      `}</style>
      {/* Case pill row */}
      <div 
        className="test-cases-scrollbar"
        style={{
        display: "flex", gap: 6, padding: "12px 20px",
        height: "56px",
        overflowX: "auto", overflowY: "hidden", borderBottom: "1px solid rgba(255,255,255,0.06)",
        scrollbarWidth: "auto",
        scrollbarColor: "rgba(255,255,255,0.15) transparent",
        width: "100%",
        flexShrink: 0
      }}>
        {testResults.map((tr, i) => {
          return (
            <button
              key={i}
              onClick={() => { setActiveIdx(i); setTab("detail"); }}
              style={{
                flexShrink: 0, padding: "6px 14px", borderRadius: 2, fontSize: 11, fontWeight: 800,
                fontFamily: "'Geist Mono', monospace", cursor: "pointer", whiteSpace: "nowrap",
                background: activeIdx === i
                  ? (tr.passed ? "rgba(0,229,176,0.1)" : "rgba(255,95,86,0.1)")
                  : "rgba(255,255,255,0.02)",
                border: `1px solid ${activeIdx === i
                  ? (tr.passed ? "rgba(0,229,176,0.5)" : "rgba(255,95,86,0.5)")
                  : "rgba(255,255,255,0.1)"}`,
                borderBottom: activeIdx === i 
                  ? `2px solid ${tr.passed ? "#00E5B0" : "#FF5F56"}`
                  : "1px solid rgba(255,255,255,0.1)",
                color: tr.passed ? "#00E5B0" : "#FF5F56",
                transition: "all var(--transition-fast)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                boxShadow: activeIdx === i ? `0 0 10px ${tr.passed ? "rgba(0,229,176,0.2)" : "rgba(255,95,86,0.2)"}` : "none",
              }}
              onMouseEnter={e => { if (activeIdx !== i) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={e => { if (activeIdx !== i) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
            >
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: tr.passed ? "#00E5B0" : "#FF5F56", marginRight: 8, boxShadow: `0 0 5px ${tr.passed ? "#00E5B0" : "#FF5F56"}` }} />
              CASE.0{i + 1}
              {tr.runtime != null && (
                <span style={{ marginLeft: 8, opacity: 0.6, fontSize: 10 }}>
                  ({tr.runtime}ms)
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
              borderBottom: tab === t ? "2px solid #00E5FF" : "2px solid transparent",
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
                background: "#060D10", padding: "16px",
                borderRadius: 4, border: "1px solid rgba(255,95,86,0.3)",
                borderLeft: "3px solid #FF5F56",
                boxShadow: "0 0 15px rgba(255,95,86,0.1)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: active.errorDetails?.message ? 12 : 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#FF5F56", fontFamily: "'Geist Mono', monospace", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                    [!] {active.errorDetails?.verdict ?? (active.compileOutput ? "COMPILE_FAULT" : "RUNTIME_CRASH")}
                  </span>
                  {active.errorDetails?.errorType && (
                    <span style={{
                      fontSize: 10, padding: "2px 8px", fontWeight: 800,
                      background: "rgba(255,95,86,0.1)", border: "1px solid rgba(255,95,86,0.2)",
                      borderRadius: 2, color: "#FF5F56", fontFamily: "'Geist Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase"
                    }}>
                      {active.errorDetails.errorType}
                    </span>
                  )}
                  {active.errorDetails?.line != null && (
                    <span style={{ fontSize: 10, color: "#FF5F56", opacity: 0.7, fontFamily: "'Geist Mono', monospace", letterSpacing: "0.1em" }}>LINE_{active.errorDetails.line}</span>
                  )}
                </div>
                {active.errorDetails?.message && (
                  <pre style={{
                    fontSize: 12, color: "#fca5a5", fontFamily: "'JetBrains Mono', monospace",
                    background: "rgba(255,95,86,0.05)", padding: "12px", borderRadius: 4,
                    border: "1px solid rgba(255,95,86,0.1)",
                    whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0,
                  }}>
                    {active.errorDetails.message}
                  </pre>
                )}
              </div>
            )}

            {/* Input */}
            <Field label="SYS.DAT_IN" hidden={isHidden}>
              {isHidden ? "🔒 HIDDEN_PAYLOAD" : active.input}
            </Field>

            {/* Stdout */}
            {active.stdout && !isHidden && (
              <Field label="SYS.STDOUT">{active.stdout}</Field>
            )}

            {/* Your Output */}
            <div>
              <Label color={active.passed ? "#00E5B0" : "#FF5F56"}>
                {active.passed ? "SYS.DAT_OUT // VERIFIED" : "SYS.DAT_OUT // MISMATCH"}
              </Label>
              <div style={{
                background: active.passed ? "rgba(0,229,176,0.05)" : "rgba(255,95,86,0.05)",
                border: `1px solid ${active.passed ? "rgba(0,229,176,0.2)" : "rgba(255,95,86,0.2)"}`,
                borderLeft: `3px solid ${active.passed ? "#00E5B0" : "#FF5F56"}`,
                padding: "12px 16px", borderRadius: 2, fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1.6,
                color: active.passed ? "#00E5B0" : "#FF5F56",
                whiteSpace: "pre-wrap", wordBreak: "break-all",
                transition: "all var(--transition-fast)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = active.passed ? "rgba(0,229,176,0.08)" : "rgba(255,95,86,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = active.passed ? "rgba(0,229,176,0.05)" : "rgba(255,95,86,0.05)"; }}
              >
                {active.actual !== null && active.actual !== undefined ? active.actual : "(NO_DATA)"}
              </div>
            </div>

            {/* Expected */}
            {!isHidden && (
              <div>
                <Label color="#00C2FF">SYS.EXPECTED</Label>
                <div style={{
                  background: "rgba(0,194,255,0.05)", border: "1px solid rgba(0,194,255,0.2)",
                  borderLeft: "3px solid #00C2FF",
                  padding: "12px 16px", borderRadius: 2, fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace", color: "#00C2FF",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap", wordBreak: "break-all",
                  transition: "all var(--transition-fast)",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,194,255,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,194,255,0.05)"; }}
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
                <Label color="#FACC15">SYS.COMPILE_OUT</Label>
                <pre style={{
                  background: "#060D10", padding: "16px", borderRadius: 4, fontSize: 12,
                  border: "1px solid rgba(250,204,21,0.2)", borderLeft: "3px solid #FACC15",
                  fontFamily: "'JetBrains Mono', monospace", color: "#FACC15",
                  overflowX: "auto", margin: 0, whiteSpace: "pre-wrap",
                }}>{active.compileOutput}</pre>
              </div>
            )}
            {active.stderr && (
              <div>
                <Label color="#FF5F56">SYS.STDERR</Label>
                <pre style={{
                  background: "#060D10", padding: "16px", borderRadius: 4, fontSize: 12,
                  border: "1px solid rgba(255,95,86,0.2)", borderLeft: "3px solid #FF5F56",
                  fontFamily: "'JetBrains Mono', monospace", color: "#FF5F56",
                  overflowX: "auto", margin: 0, whiteSpace: "pre-wrap",
                }}>{active.stderr}</pre>
              </div>
            )}
            {!active.compileOutput && !active.stderr && (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 32, fontFamily: "'Geist Mono', monospace", fontWeight: 800, letterSpacing: "0.15em" }}>
                [ SYSTEM.CONSOLE: NO_OUTPUT_DETECTED ]
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
      fontSize: 10, fontWeight: 800, color, marginBottom: 6,
      textTransform: "uppercase", letterSpacing: "0.15em",
      display: "flex", alignItems: "center", gap: 6,
      fontFamily: "'Geist Mono', monospace"
    }}>
      <span style={{ color, opacity: 0.6 }}>&gt;</span>
      {children}
    </div>
  );
}

function Field({ label, children, hidden }: { label: string; children: React.ReactNode; hidden?: boolean }) {
  return (
    <div>
      <Label color={hidden ? "#6b7280" : "#00C2FF"}>{label}</Label>
      <div style={{
        background: hidden ? "rgba(255,255,255,0.02)" : CODE_BG,
        padding: "12px 16px", borderRadius: 2, fontSize: 13,
        fontFamily: "'JetBrains Mono', monospace", color: hidden ? "#6b7280" : "#d1d5db",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap", wordBreak: "break-all",
        border: hidden ? "1px dashed rgba(255,255,255,0.1)" : "1px solid rgba(0,194,255,0.15)",
        borderLeft: hidden ? undefined : "3px solid #00C2FF",
        transition: "all var(--transition-fast)",
      }}
      onMouseEnter={e => { if (!hidden) e.currentTarget.style.background = "rgba(0,194,255,0.03)"; }}
      onMouseLeave={e => { if (!hidden) e.currentTarget.style.background = CODE_BG; }}
      >
        {children}
      </div>
    </div>
  );
}
