"use client";
import { useEffect, useState, use, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import {
  getProblem, createSubmission, getSubmission,
  getHint, getCodeFeedback, getExplanation,
  runCodeApi, explainError, getAlternativeApproach,
  type Problem, type RunResult,
} from "@/lib/api";
import { useJudgeSocket, type JudgeEvent } from "../../../hooks/useJudgeSocket";
import VerdictHeader from "@/components/result/VerdictHeader";
import TestExplorer from "@/components/result/TestExplorer";
import PerformancePanel from "@/components/result/PerformancePanel";
import AiFloatingPanel, { type AiPanelMode, type ErrorExplanation, type PerformanceReview } from "@/components/ai/AiFloatingPanel";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const LANGUAGES = ["javascript", "python", "java", "cpp"];

type ErrorDetails = { verdict: string; errorType: string; line: number | null; message: string };

type TestResult = {
  input: string; expected: string; actual: string | null;
  stdout?: string | null;
  stderr?: string | null; compileOutput?: string | null;
  passed: boolean; runtime: number | null;
  errorDetails?: ErrorDetails | null;
};

type SubmissionResult = {
  id: string; status: string; runtime: number | null; memory: number | null;
  details: { testResults: TestResult[]; passedCases: number; totalCases: number } | null;
};

// ── Failure-first helper ─────────────────────────────────────────────────
function getFirstFailingIndex(testResults: TestResult[]): number {
  const idx = testResults.findIndex((t) => !t.passed);
  return idx >= 0 ? idx : 0;
}

// ── Resizable hook (horizontal) ──────────────────────────────────────────
function useHorizontalResize(
  ref: React.RefObject<HTMLDivElement | null>,
  initial: number,
  min = 250,
  max = 680
) {
  const [width, setWidth] = useState(initial);
  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = ref.current?.offsetWidth ?? width;
      const onMove = (ev: MouseEvent) => {
        const newW = Math.max(min, Math.min(max, startW + ev.clientX - startX));
        setWidth(newW);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [ref, width, min, max]
  );
  return { width, setWidth, startResize };
}

// ── Resizable hook (vertical — terminal) ────────────────────────────────
function useVerticalResize(
  containerRef: React.RefObject<HTMLDivElement | null>,
  initial: number,
  min = 140,
  max = 520
) {
  const [height, setHeight] = useState(initial);
  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startH = height;
      const onMove = (ev: MouseEvent) => {
        const newH = Math.max(min, Math.min(max, startH - (ev.clientY - startY)));
        setHeight(newH);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [height, min, max]
  );
  return { height, setHeight, startResize };
}

// ─────────────────────────────────────────────────────────────────────────
export default function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);

  // Sidebar
  const sidebar = useSidebarState();

  // Results
  const [resultMode, setResultMode] = useState<"run" | "submit" | null>(null);
  const [result, setResult] = useState<SubmissionResult | RunResult | null>(null);
  const [activeTestIndex, setActiveTestIndex] = useState(0);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);

  // Terminal
  const [terminalOpen, setTerminalOpen] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLDivElement>(null);

  // Resizable description panel
  const desc = useHorizontalResize(descRef, 420, 260, 680);
  // Resizable terminal
  const term = useVerticalResize(containerRef, 300, 140, 520);

  // Active tabs
  const [descTab, setDescTab] = useState<"description" | "ai">("description");
  const [aiSideContent, setAiSideContent] = useState<string>("");
  const [aiSidePanel, setAiSidePanel] = useState<"hint" | "explain" | null>(null);
  const [aiSideLoading, setAiSideLoading] = useState(false);

  // Floating AI panel
  const [floatingMode, setFloatingMode] = useState<AiPanelMode | null>(null);
  const [floatingLoading, setFloatingLoading] = useState(false);
  const [floatingError, setFloatingError] = useState<ErrorExplanation | null>(null);
  const [floatingPerf, setFloatingPerf] = useState<PerformanceReview | null>(null);
  const [floatingImprove, setFloatingImprove] = useState<string | null>(null);

  // Keyboard shortcut: Ctrl+B toggles sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        sidebar.toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sidebar]);

  // Socket
  useJudgeSocket(activeSubmissionId, (event: JudgeEvent) => {
    if (event.status === "RUNNING") {
      setResult((prev: any) => ({
        ...(prev || {}),
        status: "RUNNING",
        message: event.message,
        progress: event.progress,
      }));
    } else if (event.status === "DONE" && event.submission) {
      const sub = event.submission;
      setResult({
        id: sub.id,
        status: sub.status,
        runtime: sub.runtime,
        memory: sub.memory,
        details: sub.details,
      } as any);
      setSubmitting(false);
      setActiveSubmissionId(null);
    } else if (event.status === "ERROR") {
      setResult({ id: activeSubmissionId, status: "ERROR", runtime: null, memory: null, details: null } as any);
      setSubmitting(false);
      setActiveSubmissionId(null);
    }
  });

  // Load problem
  useEffect(() => {
    getProblem(slug).then((p) => {
      setProblem(p);
      const sc = p.starterCode as Record<string, string>;
      setCode(sc?.[language] || `// Write your ${language} solution here\n`);
    });
  }, [slug]);

  useEffect(() => {
    if (!problem) return;
    const sc = problem.starterCode as Record<string, string>;
    setCode(sc?.[language] || `// Write your ${language} solution here\n`);
    setResult(null);
  }, [language]);

  // Auto-open terminal when result arrives, failure-first test selection
  useEffect(() => {
    if (!result) return;
    const status = (result as any).status;
    const testResults = getTestResults();

    // Auto-show terminal
    setTerminalOpen(true);

    // Failure-first: jump to first failing test
    if (testResults && testResults.length > 0 && status !== "ACCEPTED") {
      const firstFail = getFirstFailingIndex(testResults);
      setActiveTestIndex(firstFail);
    } else {
      setActiveTestIndex(0);
    }

    // Auto-trigger AI panels based on verdict
    const isFailure = ["RUNTIME_ERROR", "COMPILATION_ERROR", "WRONG_ANSWER", "TIME_LIMIT_EXCEEDED", "MEMORY_LIMIT_EXCEEDED"].includes(status);
    const isAccepted = status === "ACCEPTED";

    // Auto-open behavior removed per user request for both AC and Failures
  }, [result]);

  function getTestResults(): TestResult[] | undefined {
    if (resultMode === "submit") return (result as SubmissionResult)?.details?.testResults;
    return (result as RunResult)?.testResults;
  }

  // ── Run / Submit ─────────────────────────────────────────────────────────
  async function handleRun() {
    if (!problem) return;
    setRunning(true);
    setResult(null);
    setResultMode("run");
    setActiveTestIndex(0);
    setFloatingMode(null);
    try {
      const runRes = await runCodeApi(problem.id, language, code);
      setResult(runRes);
    } catch {
      setResult({ status: "REQUEST_ERROR", runtime: null, memory: null, testResults: [], passedCases: 0, totalCases: 0 } as any);
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    if (!problem) return;
    setSubmitting(true);
    setResult(null);
    setResultMode("submit");
    setActiveTestIndex(0);
    setFloatingMode(null);
    try {
      const { submissionId } = await createSubmission(problem.id, language, code);
      setActiveSubmissionId(submissionId);
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const sub = await getSubmission(submissionId);
          const isPending = sub.status === "PENDING" || sub.status === "QUEUED" || sub.status === "RUNNING";
          if (!isPending || attempts > 15) {
            clearInterval(poll);
            setResult((prev: any) => {
              if (prev && prev.status !== "QUEUED" && prev.status !== "RUNNING" && prev.status !== "PENDING") return prev;
              setSubmitting(false);
              setActiveSubmissionId(null);
              return { id: sub.id, status: sub.status, runtime: sub.runtime, memory: sub.memory, details: sub.details as SubmissionResult["details"] };
            });
          }
        } catch {
          if (attempts > 15) {
            clearInterval(poll);
            setResult((prev: any) => prev && prev.status !== "QUEUED" && prev.status !== "RUNNING" && prev.status !== "PENDING" ? prev : { id: "", status: "ERROR", runtime: null, memory: null, details: null });
            setSubmitting(false);
            setActiveSubmissionId(null);
          }
        }
      }, 5000);
    } catch {
      setResult({ id: "", status: "ERROR", runtime: null, memory: null, details: null });
      setSubmitting(false);
    }
  }

  // ── AI triggers ──────────────────────────────────────────────────────────
  async function triggerExplainError(testResults: TestResult[], status: string) {
    if (!problem) return;
    const firstFail = testResults[getFirstFailingIndex(testResults)];
    setFloatingMode("explain-error");
    setFloatingLoading(true);
    setFloatingError(null);
    try {
      const ed = firstFail?.errorDetails;
      const payload = await explainError(
        problem.id, language, code,
        ed ?? { verdict: status, errorType: "RuntimeError", line: null, message: firstFail?.stderr ?? "" },
        { input: firstFail?.input, expected: firstFail?.expected, received: firstFail?.actual }
      );
      setFloatingError({
        summary: payload.summary,
        rootCause: payload.rootCause,
        fixSteps: payload.fixSteps,
        conceptToReview: payload.conceptToReview,
      });
    } catch {
      setFloatingError({ summary: "Could not analyze error.", rootCause: "", fixSteps: [], conceptToReview: "" });
    } finally {
      setFloatingLoading(false);
    }
  }

  async function triggerPerformanceReview() {
    if (!problem) return;
    setFloatingMode("performance");
    setFloatingLoading(true);
    setFloatingPerf(null);
    try {
      const data = await getCodeFeedback(problem.id, language, code);
      setFloatingPerf({
        feedback: data.feedback,
        timeComplexity: data.timeComplexity,
        spaceComplexity: data.spaceComplexity,
        isOptimal: data.isOptimal,
        improvementTip: data.improvementTip,
        interviewNote: data.interviewNote,
      });
    } catch {
      setFloatingPerf({ feedback: "Could not generate performance review.", timeComplexity: "?", spaceComplexity: "?" });
    } finally {
      setFloatingLoading(false);
    }
  }

  async function triggerImproveApproach() {
    if (!problem) return;
    setFloatingMode("improve");
    setFloatingLoading(true);
    setFloatingImprove(null);
    try {
      const { hint } = await getAlternativeApproach(problem.id, language, code);
      setFloatingImprove(hint);
    } catch {
      setFloatingImprove("Could not generate alternative approach.");
    } finally {
      setFloatingLoading(false);
    }
  }

  async function handleSideAI(type: "hint" | "explain") {
    if (!problem) return;
    setAiSidePanel(type);
    setDescTab("ai");
    setAiSideLoading(true);
    setAiSideContent("");
    try {
      if (type === "hint") {
        const { hint } = await getHint(problem.id, code);
        setAiSideContent(hint);
      } else {
        const { explanation, approach, keyInsights } = await getExplanation(problem.id);
        setAiSideContent(`**Explanation:**\n${explanation}\n\n**Approach:**\n${approach}\n\n**Key Insights:**\n${keyInsights.map((k, i) => `${i + 1}. ${k}`).join("\n")}`);
      }
    } catch {
      setAiSideContent("Could not generate AI response. Please check your API key.");
    }
    setAiSideLoading(false);
  }

  const currentStatus = (result as any)?.status ?? "";
  const isAccepted = currentStatus === "ACCEPTED";
  const isFailureVerdict = ["RUNTIME_ERROR", "COMPILATION_ERROR", "WRONG_ANSWER", "TIME_LIMIT_EXCEEDED", "MEMORY_LIMIT_EXCEEDED"].includes(currentStatus);

  const testResults = getTestResults();
  const passedCount = resultMode === "submit" ? (result as SubmissionResult)?.details?.passedCases : (result as RunResult)?.passedCases;
  const totalCount = resultMode === "submit" ? (result as SubmissionResult)?.details?.totalCases : (result as RunResult)?.totalCases;

  if (!problem) return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
      <div style={{ color: "var(--text-muted)", fontSize: 16 }}>Loading problem...</div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg-primary)" }}>
      {/* Sidebar */}
      <Sidebar
        sidebarState={sidebar.state}
        currentWidth={sidebar.currentWidth}
        onToggle={sidebar.toggle}
      />

      {/* Main area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          transition: "margin-left 220ms cubic-bezier(0.4,0,0.2,1)",
          minWidth: 0,
        }}
      >
        {/* ── Description panel ─────────────────────────────────────────── */}
        <div
          ref={descRef}
          style={{
            width: desc.width,
            minWidth: 260,
            maxWidth: 680,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--border)",
            background: "var(--bg-secondary)",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {/* Description tab bar */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", flexShrink: 0 }}>
            {(["description", "ai"] as const).map((tab) => (
              <button key={tab} onClick={() => setDescTab(tab)}
                style={{
                  flex: 1, padding: "11px", fontSize: 13, fontWeight: 600,
                  fontFamily: "inherit", cursor: "pointer", border: "none",
                  background: descTab === tab ? "rgba(124,58,237,0.1)" : "transparent",
                  color: descTab === tab ? "var(--accent-purple-light)" : "var(--text-muted)",
                  borderBottom: descTab === tab ? "2px solid var(--accent-purple)" : "2px solid transparent",
                  transition: "all 0.18s ease",
                }}>
                {tab === "description" ? "📄 Description" : "✨ AI Assistant"}
              </button>
            ))}
          </div>

          {/* Description content */}
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            {descTab === "description" ? (
              <>
                <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14, lineHeight: 1.3 }}>
                  {problem.title.replace(/-/g, " ")}
                </h1>

                {/* Badges */}
                <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
                  <span className={`badge-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
                  {(problem.tags || []).map((tag) => (
                    <span key={tag} style={{ fontSize: 11, padding: "3px 10px", background: "rgba(255,255,255,0.05)", borderRadius: 12, color: "var(--text-secondary)" }}>{tag}</span>
                  ))}
                </div>

                {/* AI action buttons — context-aware */}
                <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
                  <button onClick={() => handleSideAI("hint")} style={{...glassBtnStyle, background: "linear-gradient(135deg, rgba(167,139,250,0.15), rgba(167,139,250,0.05))", border: "1px solid rgba(167,139,250,0.25)", color: "#c4b5fd", boxShadow: "0 4px 12px rgba(167,139,250,0.1)"}}>
                    💡 Hint
                  </button>
                  <button onClick={() => handleSideAI("explain")} style={{...glassBtnStyle, background: "linear-gradient(135deg, rgba(96,165,250,0.15), rgba(96,165,250,0.05))", border: "1px solid rgba(96,165,250,0.25)", color: "#93c5fd", boxShadow: "0 4px 12px rgba(96,165,250,0.1)"}}>
                    📖 Explain
                  </button>
                </div>

                {/* Problem description */}
                <div style={{ fontSize: 14, lineHeight: 1.85, color: "var(--text-primary)", whiteSpace: "pre-wrap", opacity: 0.9 }}>
                  {problem.description}
                </div>

                {problem.constraints && (
                  <div style={{ marginTop: 28 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text-primary)", opacity: 0.8 }}>Constraints</h3>
                    <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {problem.constraints}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* AI side panel */
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "var(--accent-purple-light)" }}>
                  {aiSidePanel === "hint" ? "💡 Hint" : aiSidePanel === "explain" ? "📖 Explanation" : "AI Assistant"}
                </h2>
                {aiSideLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)", marginTop: 40, justifyContent: "center" }}>
                    <div style={{ width: 22, height: 22, border: "2px solid var(--accent-purple)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    Generating insights...
                  </div>
                ) : aiSideContent ? (
                  <div style={{ fontSize: 14, lineHeight: 1.85, color: "var(--text-primary)", whiteSpace: "pre-wrap", background: "rgba(124,58,237,0.05)", padding: 18, borderRadius: 12, border: "1px solid rgba(124,58,237,0.1)" }}>
                    {aiSideContent}
                  </div>
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: 14, textAlign: "center", marginTop: 60, lineHeight: 1.7 }}>
                    Click <strong style={{ color: "var(--text-secondary)" }}>💡 Hint</strong> or <strong style={{ color: "var(--text-secondary)" }}>📖 Explain</strong> on the Description tab to get AI assistance.
                  </div>
                )}
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
          </div>
        </div>

        {/* ── Horizontal resize handle ──────────────────────────────────── */}
        <ResizeHandleH onMouseDown={desc.startResize} />

        {/* ── Right panel: editor + terminal ──────────────────────────── */}
        <div
          ref={containerRef}
          style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, background: "var(--bg-primary)" }}
        >
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", flexShrink: 0 }}>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 12px", color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
              {LANGUAGES.map((l) => <option key={l} value={l} style={{ background: "var(--bg-card)" }}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-secondary" style={{ padding: "6px 16px", fontSize: 13, background: "rgba(255,255,255,0.03)" }} onClick={handleRun} disabled={running || submitting}>
                {running ? "Running..." : "▶ Run"}
              </button>
              <button className="btn-primary" style={{ padding: "6px 20px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }} onClick={handleSubmit} disabled={running || submitting}>
                {submitting ? "Submitting..." : "☁ Submit"}
              </button>
            </div>
          </div>

          {/* Monaco Editor — takes remaining space */}
          <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
            <Editor
              height="100%"
              language={language === "cpp" ? "cpp" : language}
              value={code}
              onChange={(v) => setCode(v || "")}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: false },
                lineNumbers: "on",
                wordWrap: "on",
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                automaticLayout: true,
              }}
            />
          </div>

          {/* ── Terminal section ────────────────────────────────────────── */}
          {result && (
            <>
              {/* Vertical resize handle */}
              {terminalOpen && <ResizeHandleV onMouseDown={term.startResize} />}

              {/* Terminal panel */}
              <div
                style={{
                  height: terminalOpen ? term.height : 0,
                  minHeight: 0,
                  borderTop: terminalOpen ? "1px solid var(--border)" : "none",
                  background: "var(--bg-secondary)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  transition: "height 200ms cubic-bezier(0.4,0,0.2,1)",
                  flexShrink: 0,
                }}
              >
                {terminalOpen && (
                  <>
                    {/* VerdictHeader */}
                    <VerdictHeader
                      status={currentStatus}
                      runtime={result.runtime}
                      memory={(result as SubmissionResult).memory}
                      passedCases={passedCount}
                      totalCases={totalCount}
                      progressCurrent={(result as any).progress?.current}
                      progressTotal={(result as any).progress?.total}
                      progressMessage={(result as any).message}
                      mode={resultMode ?? undefined}
                    />

                    {/* Terminal tabs + controls */}
                    <TerminalTabBar
                      isTerminalOpen={terminalOpen}
                      onToggleTerminal={() => setTerminalOpen(false)}
                      testResults={testResults}
                      isAccepted={isAccepted}
                      isFailure={isFailureVerdict}
                      onExplainError={() => { if (testResults) triggerExplainError(testResults, currentStatus); }}
                      onPerformance={triggerPerformanceReview}
                      onImprove={triggerImproveApproach}
                    />

                    {/* TestExplorer or PerformancePanel */}
                    <div style={{ flex: 1, overflowY: "auto" }}>
                      {testResults && testResults.length > 0 ? (
                        <TestExplorer
                          testResults={testResults}
                          activeIndex={activeTestIndex}
                          onSelect={setActiveTestIndex}
                          totalRuntime={result.runtime}
                          memory={(result as SubmissionResult).memory}
                        />
                      ) : null}
                    </div>
                  </>
                )}
              </div>

              {/* Show terminal toggle button when collapsed */}
              {!terminalOpen && (
                <button
                  onClick={() => setTerminalOpen(true)}
                  style={{
                    position: "fixed",
                    bottom: 16,
                    right: 16,
                    zIndex: 100,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    background: "rgba(124,58,237,0.2)",
                    border: "1px solid rgba(124,58,237,0.4)",
                    borderRadius: 10,
                    color: "var(--accent-purple-light)",
                    cursor: "pointer",
                  }}
                >
                  ▲ Show Results
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Floating AI Panel ──────────────────────────────────────────── */}
      {floatingMode && (
        <AiFloatingPanel
          mode={floatingMode}
          loading={floatingLoading}
          errorData={floatingError}
          performanceData={floatingPerf}
          improveData={floatingImprove}
          onClose={() => setFloatingMode(null)}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────
const glassBtnStyle: React.CSSProperties = {
  padding: "7px 16px",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
  borderRadius: 10,
  backdropFilter: "blur(8px)",
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  display: "flex",
  alignItems: "center",
  gap: 6
};

function AIButton({ label, onClick, color = "rgba(124,58,237,0.8)" }: { label: string; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 13px", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
        cursor: "pointer", borderRadius: 8,
        background: `${color}18`,
        border: `1px solid ${color}45`,
        color,
        transition: "all 0.18s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = `${color}30`; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = `${color}18`; }}
    >
      {label}
    </button>
  );
}

function ResizeHandleH({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 5,
        cursor: "col-resize",
        flexShrink: 0,
        background: hover ? "rgba(124,58,237,0.5)" : "transparent",
        transition: "background 150ms ease",
        position: "relative",
        zIndex: 10,
        userSelect: "none",
      }}
    >
      {/* Visual dot indicator */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 3,
        height: 40,
        borderRadius: 99,
        background: hover ? "#7c3aed" : "rgba(255,255,255,0.12)",
        transition: "background 150ms ease, height 150ms ease",
      }} />
    </div>
  );
}

function ResizeHandleV({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 6,
        cursor: "row-resize",
        flexShrink: 0,
        background: hover ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.02)",
        transition: "background 150ms ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
      }}
    >
      <div style={{
        width: 40,
        height: 3,
        borderRadius: 99,
        background: hover ? "#7c3aed" : "rgba(255,255,255,0.15)",
        transition: "background 150ms ease, width 150ms ease",
      }} />
    </div>
  );
}

function TerminalTabBar({
  isTerminalOpen, onToggleTerminal,
  testResults, isAccepted, isFailure,
  onExplainError, onPerformance, onImprove,
}: {
  isTerminalOpen: boolean;
  onToggleTerminal: () => void;
  testResults?: TestResult[];
  isAccepted: boolean;
  isFailure: boolean;
  onExplainError: () => void;
  onPerformance: () => void;
  onImprove: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", borderBottom: "1px solid var(--border)", flexShrink: 0, minHeight: 46 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginRight: 8 }}>Results</span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {isFailure && testResults && testResults.length > 0 && (
          <QuickBtn label="✨ Explain Error" color="#f97316" onClick={onExplainError} />
        )}
        {isAccepted && (
          <>
            <QuickBtn label="📊 Performance" color="#22c55e" onClick={onPerformance} />
            <QuickBtn label="🔀 Improve" color="#a78bfa" onClick={onImprove} />
          </>
        )}
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />
        <button
          onClick={onToggleTerminal}
          title="Hide terminal"
          style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-muted)", transition: "all 0.15s ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-muted)"; }}
        >
          ▼ Hide
        </button>
      </div>
    </div>
  );
}

function QuickBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: "3px 10px", fontSize: 11, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", borderRadius: 6, background: `${color}14`, border: `1px solid ${color}35`, color, transition: "all 0.15s ease" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = `${color}25`; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = `${color}14`; }}
    >
      {label}
    </button>
  );
}
