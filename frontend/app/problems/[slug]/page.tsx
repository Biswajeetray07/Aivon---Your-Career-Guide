"use client";
import { useEffect, useState, use, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import { getProblem, createSubmission, getSubmission, getHint, getCodeFeedback, getExplanation, runCodeApi, explainError, getAlternativeApproach, type Problem, type RunResult, type ErrorExplanationResult } from "@/lib/api";
import { useJudgeSocket, type JudgeEvent } from "../../../hooks/useJudgeSocket";
import VerdictHeader from "@/components/result/VerdictHeader";
import TestExplorer from "@/components/result/TestExplorer";
import PerformancePanel from "@/components/result/PerformancePanel";
import AiFloatingPanel, { type AiPanelMode, type PerformanceReview } from "@/components/ai/AiFloatingPanel";
import { useHorizontalResize, useVerticalResize } from "@/hooks/useResize";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
const DiffEditorLazy = dynamic(() => import("@monaco-editor/react").then(m => ({ default: m.DiffEditor })), { ssr: false });

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

export default function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { state: sidebarState, currentWidth: sidebarWidth, toggle: toggleSidebar } = useSidebarState();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);

  // Resize state
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const [descWidth, startDescResize] = useHorizontalResize(460, 300, 700);
  const [resultsHeight, startResultsResize] = useVerticalResize(280, 140, rightPanelRef);
  const [resultsOpen, setResultsOpen] = useState(true);

  // Monaco editor instance ref (for keyboard shortcuts + markers)
  const monacoEditorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  // WA diff view
  const [showDiff, setShowDiff] = useState(false);
  const [diffOriginal, setDiffOriginal] = useState(""); // expected
  const [diffModified, setDiffModified] = useState(""); // user output

  // Results State
  const [resultMode, setResultMode] = useState<"run" | "submit" | null>(null);
  const [result, setResult] = useState<SubmissionResult | RunResult | null>(null);
  const [resultsTab, setResultsTab] = useState<"testcases" | "analytics">("testcases");

  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);

  useJudgeSocket(activeSubmissionId, (event: JudgeEvent) => {
    if (event.status === "RUNNING") {
      setResult((prev: any) => ({
        ...(prev || {}),
        status: "RUNNING",
        _message: event.message,
        _progress: event.progress,
      }));
    } else if (event.status === "DONE" && event.submission) {
      setResult({
        id: event.submission.id,
        status: event.submission.status,
        runtime: event.submission.runtime,
        memory: event.submission.memory,
        details: event.submission.details,
      } as any);
      setSubmitting(false);
      setActiveSubmissionId(null);
    } else if (event.status === "ERROR") {
      setResult({ id: activeSubmissionId, status: "INTERNAL_ERROR", runtime: null, memory: null, details: null } as any);
      setSubmitting(false);
      setActiveSubmissionId(null);
    }
  });

  // Sidebar AI (hint / explain)
  const [aiPanel, setAiPanel] = useState<"hint" | "explain" | null>(null);
  const [aiContent, setAiContent] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "ai">("description");

  // Floating AI panel
  const [floatMode, setFloatMode] = useState<AiPanelMode | null>(null);
  const [floatLoading, setFloatLoading] = useState(false);
  const [floatErrorData, setFloatErrorData] = useState<ErrorExplanationResult | null>(null);
  const [floatPerfData, setFloatPerfData] = useState<PerformanceReview | null>(null);
  const [floatImproveData, setFloatImproveData] = useState<string | null>(null);

  // Persistent code per problem+language (500ms debounce)
  // Ctrl+B — toggle sidebar (VSCode standard)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleSidebar]);

  useEffect(() => {
    if (!problem || !code) return;
    const key = `code:${problem.id}:${language}`;
    const id = setTimeout(() => localStorage.setItem(key, code), 500);
    return () => clearTimeout(id);
  }, [code, problem, language]);

  useEffect(() => {
    getProblem(slug).then((p) => {
      setProblem(p);
      const saved = localStorage.getItem(`code:${p.id}:${language}`);
      const sc = p.starterCode as Record<string, string>;
      setCode(saved ?? sc?.[language] ?? `// Write your ${language} solution here\n`);
    });
  }, [slug]);

  useEffect(() => {
    if (!problem) return;
    const saved = localStorage.getItem(`code:${problem.id}:${language}`);
    const sc = problem.starterCode as Record<string, string>;
    setCode(saved ?? sc?.[language] ?? `// Write your ${language} solution here\n`);
    setResult(null);
  }, [language]);

  async function handleRun() {
    if (!problem) return;
    setRunning(true);
    setResult(null);
    setResultMode("run");
    setResultsTab("testcases");
    try {
      // 30s hard timeout safety net — spinner can NEVER get stuck
      const RUN_TIMEOUT = 35000; // Judge0 max = 20s, give 15s buffer
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("HARD_TIMEOUT")), RUN_TIMEOUT)
      );
      const runRes = await Promise.race([
        runCodeApi(problem.id, language, code),
        timeoutPromise,
      ]);
      setResult(runRes);
    } catch (err: any) {
      const isHardTimeout = err?.message === "HARD_TIMEOUT";
      setResult({
        status: "INTERNAL_ERROR", runtime: null, memory: null,
        testResults: [{
          input: "", expected: "", actual: null, stdout: null,
          stderr: isHardTimeout
            ? "The judge is taking too long to respond. Please try again."
            : "Request failed. Please check your connection.",
          compileOutput: null, passed: false, runtime: null,
          errorDetails: {
            verdict: isHardTimeout ? "Judge Unavailable" : "Request Error",
            errorType: isHardTimeout ? "JudgeTimeout" : "NetworkError",
            line: null,
            message: isHardTimeout
              ? "The judge server did not respond within 30 seconds. This is NOT a problem with your code."
              : err?.message ?? "Network error",
          },
        }],
        passedCases: 0, totalCases: 0,
      } as any);
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    if (!problem) return;
    setSubmitting(true);
    setResult(null);
    setResultMode("submit");
    setResultsTab("testcases");
    try {
      const { submissionId } = await createSubmission(problem.id, language, code);
      setActiveSubmissionId(submissionId);

      // Hybrid fallback polling
      let attempts = 0;
      let settled = false;
      const poll = setInterval(async () => {
        if (settled) return;
        attempts++;
        try {
          const sub = await getSubmission(submissionId);
          const isPending = ["PENDING", "QUEUED", "RUNNING"].includes(sub.status);
          if (!isPending || attempts > 15) {
            settled = true;
            clearInterval(poll);
            setResult((prev: any) => {
              if (prev && !["QUEUED", "RUNNING", "PENDING"].includes(prev.status)) return prev;
              setSubmitting(false);
              setActiveSubmissionId(null);
              return { id: sub.id, status: sub.status, runtime: sub.runtime, memory: sub.memory, details: sub.details };
            });
          }
        } catch {
          if (attempts > 15) {
            settled = true;
            clearInterval(poll);
            setResult({ id: "", status: "INTERNAL_ERROR", runtime: null, memory: null, details: null });
            setSubmitting(false);
            setActiveSubmissionId(null);
          }
        }
      }, 5000);

      // 45s HARD TIMEOUT — spinner can NEVER get stuck
      setTimeout(() => {
        if (!settled) {
          settled = true;
          clearInterval(poll);
          setResult((prev: any) => {
            if (prev && !["QUEUED", "RUNNING", "PENDING"].includes(prev.status)) return prev;
            setSubmitting(false);
            setActiveSubmissionId(null);
            return {
              id: submissionId, status: "INTERNAL_ERROR", runtime: null, memory: null,
              details: {
                testResults: [{
                  input: "", expected: "", actual: null, stdout: null,
                  stderr: "The judge is taking too long. Please try again.",
                  compileOutput: null, passed: false, runtime: null,
                  errorDetails: {
                    verdict: "Judge Unavailable",
                    errorType: "JudgeTimeout",
                    line: null,
                    message: "The judge did not respond within 45 seconds. This is NOT a problem with your code.",
                  },
                }],
                passedCases: 0, totalCases: 0,
              },
            };
          });
        }
      }, 45000);
    } catch {
      setResult({ id: "", status: "INTERNAL_ERROR", runtime: null, memory: null, details: null });
      setSubmitting(false);
    }
  }

  // ── Monaco error markers ─────────────────────────────────────────────────
  useEffect(() => {
    const editor = monacoEditorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const model = editor.getModel();
    if (!model) return;

    const testResults = (result as any)?.testResults ?? (result as any)?.details?.testResults ?? [];
    const markers: any[] = [];

    testResults.forEach((tr: any) => {
      const ed = tr.errorDetails;
      if (ed?.line != null) {
        markers.push({
          startLineNumber: ed.line, startColumn: 1,
          endLineNumber: ed.line, endColumn: 999,
          message: `${ed.errorType}: ${ed.message}`,
          severity: monaco.MarkerSeverity.Error,
        });
      }
    });

    monaco.editor.setModelMarkers(model, "aivon-judge", markers);
  }, [result]);

  // ── WA diff: show expected vs actual for first visible failed test ────────
  useEffect(() => {
    const testResults = (result as any)?.testResults ?? (result as any)?.details?.testResults ?? [];
    const firstFailed = testResults.find((t: any) => !t.passed);
    if ((result as any)?.status === "WRONG_ANSWER" && firstFailed && firstFailed.expected != null && firstFailed.actual != null) {
      setDiffOriginal(String(firstFailed.expected));
      setDiffModified(String(firstFailed.actual ?? ""));
      setShowDiff(true);
    } else {
      setShowDiff(false);
      setDiffOriginal("");
      setDiffModified("");
    }
  }, [result, (result as any)?.status]);

  function handleMonacoMount(editor: any, monaco: any) {
    monacoEditorRef.current = editor;
    monacoRef.current = monaco;

    // Ctrl+Enter → Run
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => { handleRun(); }
    );
    // Ctrl+Shift+Enter → Submit
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
      () => { handleSubmit(); }
    );
  }

  async function handleAI(type: "hint" | "explain") {
    if (!problem) return;
    setAiPanel(type);
    setActiveTab("ai");
    setAiLoading(true);
    setAiContent("");
    try {
      if (type === "hint") {
        const { hint } = await getHint(problem.id, code);
        setAiContent(hint);
      } else {
        const { explanation, approach, keyInsights } = await getExplanation(problem.id);
        setAiContent(`Explanation:\n${explanation}\n\nApproach:\n${approach}\n\nKey Insights:\n${keyInsights.map((k, i) => `${i + 1}. ${k}`).join("\n")}`);
      }
    } catch {
      setAiContent("Could not generate AI response. Please check your API key.");
    }
    setAiLoading(false);
  }

  async function handleExplainError() {
    if (!problem || !result) return;
    const tests = (result as any)?.testResults ?? (result as any)?.details?.testResults ?? [];
    const firstFailed = tests.find((t: any) => !t.passed);
    const isWA = resultStatus === "WRONG_ANSWER";
    const errDetails = firstFailed?.errorDetails ?? {
      verdict: resultStatus, errorType: isWA ? "WrongAnswer" : "RuntimeError", line: null, message: "Unknown error",
    };
    const testcase = firstFailed ? {
      input: firstFailed.input,
      expected: firstFailed.expected,
      received: firstFailed.actual,
      isHidden: !firstFailed.input && resultMode === "submit",
    } : undefined;

    setFloatMode("explain-error");
    setFloatLoading(true);
    setFloatErrorData(null);
    try {
      const data = await explainError(problem.id, language, code, errDetails, testcase);
      setFloatErrorData(data);
    } catch {
      setFloatErrorData({ summary: "Could not analyse the error.", rootCause: "", fixSteps: ["Check the error message in the Test Cases tab."], conceptToReview: "Debugging" });
    }
    setFloatLoading(false);
  }

  async function handlePerformanceReview() {
    if (!problem) return;
    setFloatMode("performance");
    setFloatLoading(true);
    setFloatPerfData(null);
    try {
      const data = await getCodeFeedback(problem.id, language, code);
      setFloatPerfData(data);
    } catch {
      setFloatPerfData({ feedback: "Could not generate review.", timeComplexity: "?", spaceComplexity: "?" });
    }
    setFloatLoading(false);
  }

  async function handleImproveApproach() {
    if (!problem) return;
    setFloatMode("improve");
    setFloatLoading(true);
    setFloatImproveData(null);
    try {
      const { hint } = await getAlternativeApproach(problem.id, language, code);
      setFloatImproveData(hint);
    } catch {
      setFloatImproveData("Could not generate alternative approach.");
    }
    setFloatLoading(false);
  }

  if (!problem) return (
    <div className="layout" style={{ display: "flex" }}>
      <Sidebar sidebarState={sidebarState} currentWidth={sidebarWidth} onToggle={toggleSidebar} />
      <main className="main" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-muted)", fontSize: 16 }}>Loading problem...</div>
      </main>
    </div>
  );

  // Resolve test results regardless of mode
  const testResults = resultMode === "submit"
    ? (result as SubmissionResult)?.details?.testResults
    : (result as RunResult)?.testResults;
  const passedCount = resultMode === "submit"
    ? (result as SubmissionResult)?.details?.passedCases
    : (result as RunResult)?.passedCases;
  const totalCount = resultMode === "submit"
    ? (result as SubmissionResult)?.details?.totalCases
    : (result as RunResult)?.totalCases;

  // For submit, visible test cases = testCases that are not hidden (first N)
  const visibleCount = problem.testCases?.filter(tc => !(tc as any).isHidden).length ?? 3;

  const resultStatus = (result as any)?.status ?? "";
  const isDone = resultStatus && !["PENDING", "QUEUED", "RUNNING"].includes(resultStatus);

  return (
    <div className="layout">
      <Sidebar sidebarState={sidebarState} currentWidth={sidebarWidth} onToggle={toggleSidebar} />
      <main style={{
        marginLeft: 0,
        display: "flex",
        height: "100vh",
        flex: 1,
        minWidth: 0,
        overflow: "hidden",
        transition: "flex 220ms cubic-bezier(0.4,0,0.2,1)",
      }}>

        {/* ── Left panel — description / AI — resizable ── */}
        <div style={{ width: descWidth, minWidth: 300, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--bg-secondary)", position: "relative", flexShrink: 0 }}>
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
            {(["description", "ai"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: "12px", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                  cursor: "pointer", border: "none",
                  background: activeTab === tab ? "rgba(124,58,237,0.1)" : "transparent",
                  color: activeTab === tab ? "var(--accent-purple-light)" : "var(--text-muted)",
                  borderBottom: activeTab === tab ? "2px solid var(--accent-purple)" : "2px solid transparent",
                }}>
                {tab === "description" ? "📄 Description" : "✨ AI Assistant"}
              </button>
            ))}
          </div>

          <div style={{ padding: 24, flex: 1, overflowY: "auto" }}>
            {activeTab === "description" ? (
              <>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>{problem.title.replace(/-/g, " ")}</h1>
                <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
                  <span className={`badge-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
                  {problem.judgeMode && problem.judgeMode !== "exact" && (() => {
                    const META: Record<string, { label: string; color: string }> = {
                      unordered: { label: "⚡ Unordered", color: "#a78bfa" },
                      float:     { label: "🔢 Float",     color: "#60a5fa" },
                      multiline: { label: "📄 Multiline", color: "#34d399" },
                      spj:       { label: "🛡️ SPJ",       color: "#f59e0b" },
                    };
                    const m = META[problem.judgeMode];
                    return m ? (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", background: `${m.color}18`, color: m.color, border: `1px solid ${m.color}40`, borderRadius: 12 }}>
                        {m.label}
                      </span>
                    ) : null;
                  })()}
                  {(problem.tags || []).map(tag => (
                    <span key={tag} style={{ fontSize: 11, padding: "3px 10px", background: "rgba(255,255,255,0.05)", borderRadius: 12, color: "var(--text-secondary)" }}>{tag}</span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                  {(["💡 Hint", "📖 Explain"] as const).map((label) => {
                    const type = label === "💡 Hint" ? "hint" : "explain";
                    return (
                      <button key={type} onClick={() => handleAI(type)}
                        style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", borderRadius: 8, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--accent-purple-light)", transition: "all 0.2s" }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-primary)", whiteSpace: "pre-wrap", opacity: 0.9 }}>
                  {problem.description}
                </div>
                {problem.constraints && (
                  <div style={{ marginTop: 32 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, opacity: 0.8 }}>Constraints</h3>
                    <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: 16, fontSize: 13, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {problem.constraints}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--accent-purple-light)" }}>
                  {aiPanel === "hint" ? "💡 Hint" : aiPanel === "explain" ? "📖 Explanation" : "AI Assistant"}
                </h2>
                {aiLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-muted)", marginTop: 40, justifyContent: "center" }}>
                    <div style={{ width: 24, height: 24, border: "2px solid var(--accent-purple)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    Generating insights...
                  </div>
                ) : aiContent ? (
                  <div style={{ fontSize: 14, lineHeight: 1.9, color: "var(--text-primary)", whiteSpace: "pre-wrap", background: "rgba(124,58,237,0.05)", padding: 20, borderRadius: 12, border: "1px solid rgba(124,58,237,0.1)" }}>
                    {aiContent}
                  </div>
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: 14, textAlign: "center", marginTop: 60 }}>
                    Click one of the AI buttons on the Description tab to get intelligent assistance for this problem.
                  </div>
                )}
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
          </div>

          {/* ── Drag handle for description panel ── */}
          <div
            onMouseDown={startDescResize}
            style={{
              position: "absolute", top: 0, right: -3, bottom: 0, width: 6,
              cursor: "col-resize", zIndex: 10,
              background: "transparent",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,58,237,0.5)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          />
        </div>

        {/* ── Right panel — editor + results ── */}
        <div ref={rightPanelRef} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-primary)", minWidth: 0 }}>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 12px", color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
              {LANGUAGES.map(l => <option key={l} value={l} style={{ background: "var(--bg-card)" }}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-secondary" style={{ padding: "6px 16px", fontSize: 13, background: "rgba(255,255,255,0.03)" }} onClick={handleRun} disabled={running || submitting}>
                {running ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 12, height: 12, border: "2px solid #8b8ca7", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                    Running…
                  </span>
                ) : "▶ Run"}
              </button>
              <button className="btn-primary" style={{ padding: "6px 20px", fontSize: 13 }} onClick={handleSubmit} disabled={running || submitting}>
                {submitting ? "Submitting…" : "☁ Submit"}
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            <Editor
              height="100%"
              language={language === "cpp" ? "cpp" : language}
              value={code}
              onChange={(v) => setCode(v || "")}
              onMount={handleMonacoMount}
              theme="vs-dark"
              options={{
                fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: false }, lineNumbers: "on", wordWrap: "on",
                scrollBeyondLastLine: false, padding: { top: 16 },
                smoothScrolling: true, cursorBlinking: "smooth",
                automaticLayout: true, tabSize: 2,
              }}
            />
          </div>

          {/* ── Results Panel ── */}
          {result && (
            <div style={{
              height: resultsOpen ? resultsHeight : 64,
              minHeight: resultsOpen ? 200 : 64,
              margin: resultsOpen ? 0 : "0 16px 16px 16px",
              borderRadius: resultsOpen ? 0 : 12,
              border: resultsOpen ? "none" : "1px solid var(--border)",
              borderTop: resultsOpen ? "1px solid var(--border)" : undefined,
              boxShadow: resultsOpen ? "none" : "0 8px 32px rgba(0,0,0,0.3)",
              background: "var(--bg-secondary)",
              display: "flex", flexDirection: "column",
              transition: "all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
              flexShrink: 0,
              overflow: "hidden",
            }}>

              {/* Vertical drag handle (only when open) */}
              {resultsOpen && (
                <div
                  onMouseDown={startResultsResize}
                  style={{
                    height: 5, cursor: "ns-resize", flexShrink: 0,
                    background: "transparent", transition: "background 0.15s",
                    borderBottom: "1px solid var(--border)",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,58,237,0.4)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                />
              )}

              {/* Verdict Header (always shown) + collapse toggle */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <VerdictHeader
                    status={resultStatus}
                    runtime={result.runtime}
                    memory={result.memory}
                    passedCases={passedCount}
                    totalCases={totalCount}
                    progressCurrent={(result as any)._progress?.current}
                    progressTotal={(result as any)._progress?.total}
                    progressMessage={(result as any)._message}
                    mode={resultMode ?? undefined}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 16 }}>
                  <button
                    onClick={() => setResultsOpen(o => !o)}
                    title={resultsOpen ? "Hide results" : "Show results"}
                    style={{
                      flexShrink: 0,
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 6, width: 28, height: 28, cursor: "pointer",
                      color: "#6b7280", fontSize: 14, fontFamily: "inherit",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    {resultsOpen ? "▼" : "▲"}
                  </button>
                  <button
                    onClick={() => { setResult(null); setResultMode(null); setResultsOpen(true); }}
                    title="Close terminal"
                    style={{
                      flexShrink: 0,
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 6, width: 28, height: 28, cursor: "pointer",
                      color: "#ef4444", fontSize: 14, fontFamily: "inherit",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Tab bar + AI buttons + WA diff toggle (only when open) */}
              {isDone && resultsOpen && (
                <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--border)", padding: "0 16px", gap: 4 }}>
                  {([["testcases", "🧪 Test Cases"], ["analytics", "📊 Analytics"]] as const).map(([t, label]) => (
                    <button key={t} onClick={() => setResultsTab(t)}
                      style={{
                        padding: "9px 16px", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                        cursor: "pointer", border: "none", background: "transparent",
                        color: resultsTab === t ? "var(--text-primary)" : "var(--text-muted)",
                        borderBottom: resultsTab === t ? "2px solid var(--accent-purple)" : "2px solid transparent",
                        transition: "all 0.15s",
                      }}>{label}</button>
                  ))}

                  {/* Spacer */}
                  <div style={{ flex: 1 }} />

                  {/* Error state: Explain Error */}
                  {["WRONG_ANSWER", "RUNTIME_ERROR", "COMPILATION_ERROR", "TIME_LIMIT_EXCEEDED"].includes(resultStatus) && (
                    <button onClick={handleExplainError} style={aiActionBtn("#f97316")}>
                      ✨ Explain Error
                    </button>
                  )}

                  {/* Success state: Performance + Improve */}
                  {resultStatus === "ACCEPTED" && (
                    <>
                      <button onClick={handlePerformanceReview} style={aiActionBtn("#22c55e")}>
                        📊 Performance
                      </button>
                      <button onClick={handleImproveApproach} style={aiActionBtn("#a78bfa")}>
                        🔀 Improve
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Content — only when open */}
              {resultsOpen && (
              <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {/* While running */}
                {!isDone && (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>
                    Executing test cases…
                  </div>
                )}

                {/* WA Diff (Monaco DiffEditor) */}
                {isDone && resultsTab === "testcases" && showDiff && (
                  <div style={{ height: 180, borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                    <div style={{ padding: "6px 16px", fontSize: 11, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>⚡ Expected vs Your Output</span>
                      <button onClick={() => setShowDiff(false)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 13 }}>✕ Hide</button>
                    </div>
                    <DiffEditorLazy
                      height="140px"
                      original={diffOriginal}
                      modified={diffModified}
                      language="plaintext"
                      theme="vs-dark"
                      options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, lineNumbers: "off", renderSideBySide: true }}
                    />
                  </div>
                )}

                {/* Test Explorer */}
                {isDone && resultsTab === "testcases" && (
                  <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    {testResults && testResults.length > 0 ? (
                      <TestExplorer
                        testResults={testResults}
                        mode={resultMode ?? undefined}
                        visibleCount={resultMode === "submit" ? visibleCount : undefined}
                      />
                    ) : (
                      <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                        {resultStatus === "COMPILATION_ERROR"
                          ? "❌ Code failed to compile. Check the error details above."
                          : "No individual test results available."}
                      </div>
                    )}
                  </div>
                )}

                {/* Analytics tab */}
                {isDone && resultsTab === "analytics" && (
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    <PerformancePanel
                      testResults={testResults ?? []}
                      totalRuntime={result.runtime}
                      memory={result.memory}
                    />
                  </div>
                )}
              </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Floating AI Panel */}
      {floatMode && (
        <AiFloatingPanel
          mode={floatMode}
          loading={floatLoading}
          errorData={floatErrorData}
          performanceData={floatPerfData}
          improveData={floatImproveData}
          onClose={() => { setFloatMode(null); setFloatErrorData(null); setFloatPerfData(null); setFloatImproveData(null); }}
        />
      )}
    </div>
  );
}

function aiActionBtn(color: string): React.CSSProperties {
  return {
    padding: "5px 12px", fontSize: 11, fontWeight: 700, fontFamily: "inherit",
    cursor: "pointer", borderRadius: 20, border: `1px solid ${color}40`,
    background: `${color}10`, color, transition: "all 0.15s", whiteSpace: "nowrap",
  };
}
