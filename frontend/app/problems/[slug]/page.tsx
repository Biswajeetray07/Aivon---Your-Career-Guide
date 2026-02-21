"use client";
import { useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import { getProblem, createSubmission, getSubmission, getHint, getCodeFeedback, getExplanation, runCodeApi, type Problem, type RunResult } from "@/lib/api";
import { useJudgeSocket, type JudgeEvent } from "../../../hooks/useJudgeSocket";

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

export default function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  
  // Results State
  const [resultMode, setResultMode] = useState<"run" | "submit" | null>(null);
  const [result, setResult] = useState<SubmissionResult | RunResult | null>(null);
  const [activeTestIndex, setActiveTestIndex] = useState(0);

  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);

  useJudgeSocket(activeSubmissionId, (event: JudgeEvent) => {
    if (event.status === "RUNNING") {
      setResult((prev: any) => ({
        ...(prev || {}),
        status: "RUNNING",
        message: event.message,
        progress: event.progress,
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
      setResult({ id: activeSubmissionId, status: "ERROR", runtime: null, memory: null, details: null } as any);
      setSubmitting(false);
      setActiveSubmissionId(null);
    }
  });

  const [aiPanel, setAiPanel] = useState<"hint" | "explain" | "feedback" | null>(null);
  const [aiContent, setAiContent] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "ai">("description");
  const [resultsTab, setResultsTab] = useState<"testcases" | "console">("testcases");

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
    setResult(null); // Clear result on language change
  }, [language]);

  async function handleRun() {
    if (!problem) return;
    setRunning(true);
    setResult(null);
    setResultMode("run");
    setResultsTab("testcases");
    setActiveTestIndex(0);
    try {
      const runRes = await runCodeApi(problem.id, language, code);
      setResult(runRes);
    } catch (err: any) {
      setResult({ status: "REQUEST_ERROR", runtime: null, memory: null, testResults: [], passedCases: 0, totalCases: 0 });
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
    setActiveTestIndex(0);
    try {
      const { submissionId } = await createSubmission(problem.id, language, code);
      setActiveSubmissionId(submissionId);

      // Hybrid fallback: poll every 5s just in case WebSocket drops
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const sub = await getSubmission(submissionId);
          const isPending = sub.status === "PENDING" || sub.status === "QUEUED" || sub.status === "RUNNING";
          if (!isPending || attempts > 15) {
            clearInterval(poll);
            setResult((prev: any) => {
              // Only overwrite if socket didn't already finish it
              if (prev && prev.status !== "QUEUED" && prev.status !== "RUNNING" && prev.status !== "PENDING") return prev;
              setSubmitting(false);
              setActiveSubmissionId(null);
              return { id: sub.id, status: sub.status, runtime: sub.runtime, memory: sub.memory, details: sub.details as SubmissionResult["details"] };
            });
          }
        } catch (err) {
          if (attempts > 15) {
            clearInterval(poll);
            setResult((prev: any) => prev && prev.status !== "QUEUED" && prev.status !== "RUNNING" && prev.status !== "PENDING" ? prev : { id: "", status: "ERROR", runtime: null, memory: null, details: null });
            setSubmitting(false);
            setActiveSubmissionId(null);
          }
        }
      }, 5000);
    } catch (err: unknown) {
      setResult({ id: "", status: "ERROR", runtime: null, memory: null, details: null });
      setSubmitting(false);
    }
  }

  async function handleAI(type: "hint" | "explain" | "feedback") {
    if (!problem) return;
    setAiPanel(type);
    setActiveTab("ai");
    setAiLoading(true);
    setAiContent("");
    try {
      if (type === "hint") {
        const { hint } = await getHint(problem.id, code);
        setAiContent(hint);
      } else if (type === "explain") {
        const { explanation, approach, keyInsights } = await getExplanation(problem.id);
        setAiContent(`**Explanation:**\n${explanation}\n\n**Approach:**\n${approach}\n\n**Key Insights:**\n${keyInsights.map((k, i) => `${i + 1}. ${k}`).join("\n")}`);
      } else {
        const { feedback, timeComplexity, spaceComplexity } = await getCodeFeedback(problem.id, language, code);
        setAiContent(`**Feedback:**\n${feedback}\n\n⏱ Time: ${timeComplexity}\n💾 Space: ${spaceComplexity}`);
      }
    } catch {
      setAiContent("Could not generate AI response. Please check your API key.");
    }
    setAiLoading(false);
  }

  const VERDICT_META: Record<string, { label: string; color: string; emoji: string }> = {
    ACCEPTED:             { label: "Accepted",              color: "var(--green)",        emoji: "✅" },
    WRONG_ANSWER:         { label: "Wrong Answer",          color: "var(--red)",          emoji: "❌" },
    TIME_LIMIT_EXCEEDED:  { label: "Time Limit Exceeded",   color: "#eab308",             emoji: "⏱️" },
    MEMORY_LIMIT_EXCEEDED:{ label: "Memory Limit Exceeded", color: "#eab308",             emoji: "🧠" },
    COMPILATION_ERROR:    { label: "Compile Error",         color: "var(--red)",          emoji: "🔴" },
    RUNTIME_ERROR:        { label: "Runtime Error",         color: "#f97316",             emoji: "💥" },
    INTERNAL_ERROR:       { label: "Internal Error",        color: "var(--text-muted)",   emoji: "⚠️" },
    PENDING:              { label: "Queued…",               color: "var(--accent-blue)",  emoji: "⌛" },
    QUEUED:               { label: "Queued…",               color: "var(--accent-blue)",  emoji: "⌛" },
    RUNNING:              { label: "Running…",              color: "var(--accent-blue)",  emoji: "🔄" },
    REQUEST_ERROR:        { label: "Request Error",         color: "var(--text-muted)",   emoji: "⚠️" },
  };

  const getVerdict = (s: string) =>
    VERDICT_META[s] ??
    { label: s.split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" "), color: "var(--red)", emoji: "❌" };

  const statusColor = (s: string) => getVerdict(s).color;
  const formatStatus = (s: string) => `${getVerdict(s).emoji} ${getVerdict(s).label}`;

  if (!problem) return (
    <div className="layout"><Sidebar />
      <main className="main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-muted)", fontSize: 16 }}>Loading problem...</div>
      </main>
    </div>
  );

  const testResults = resultMode === "submit" ? (result as SubmissionResult)?.details?.testResults : (result as RunResult)?.testResults;
  const activeTest = testResults?.[activeTestIndex];
  const passedCount = resultMode === "submit" ? (result as SubmissionResult)?.details?.passedCases : (result as RunResult)?.passedCases;
  const totalCount = resultMode === "submit" ? (result as SubmissionResult)?.details?.totalCases : (result as RunResult)?.totalCases;

  return (
    <div className="layout">
      <Sidebar />
      <main style={{ marginLeft: 240, display: "flex", height: "100vh", width: "calc(100vw - 240px)", overflow: "hidden" }}>
        {/* Left panel — problem description */}
        <div style={{ width: "45%", display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", zIndex: 10 }}>
            {["description", "ai"].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab as "description" | "ai")}
                style={{ flex: 1, padding: "12px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", border: "none",
                  background: activeTab === tab ? "rgba(124,58,237,0.1)" : "transparent",
                  color: activeTab === tab ? "var(--accent-purple-light)" : "var(--text-muted)",
                  borderBottom: activeTab === tab ? "2px solid var(--accent-purple)" : "2px solid transparent" }}>
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
                    const JUDGE_MODE_META: Record<string, { label: string; color: string; bg: string }> = {
                      unordered: { label: "⚡ Unordered",  color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
                      float:     { label: "🔢 Float",      color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
                      multiline: { label: "📄 Multiline",  color: "#34d399", bg: "rgba(52,211,153,0.1)" },
                      spj:       { label: "🛡️ SPJ",        color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
                    };
                    const meta = JUDGE_MODE_META[problem.judgeMode];
                    if (!meta) return null;
                    return (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px",
                        background: meta.bg, color: meta.color,
                        border: `1px solid ${meta.color}40`, borderRadius: 12 }}>
                        {meta.label}
                      </span>
                    );
                  })()}
                  {(problem.tags || []).map((tag) => (
                    <span key={tag} style={{ fontSize: 11, padding: "3px 10px", background: "rgba(255,255,255,0.05)", borderRadius: 12, color: "var(--text-secondary)" }}>{tag}</span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                  {[["💡 Hint", "hint"], ["📖 Explain", "explain"], ["🔍 Feedback", "feedback"]].map(([label, type]) => (
                    <button key={type} onClick={() => handleAI(type as "hint" | "explain" | "feedback")}
                      style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", borderRadius: 8,
                        background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--accent-purple-light)",
                        transition: "all 0.2s" }}>
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-primary)", whiteSpace: "pre-wrap", opacity: 0.9 }}>
                  {problem.description}
                </div>
                {problem.constraints && (
                  <div style={{ marginTop: 32 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--text-primary)", opacity: 0.8 }}>Constraints</h3>
                    <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: 16, fontSize: 13, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {problem.constraints}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--accent-purple-light)" }}>
                  {aiPanel === "hint" ? "💡 Hint" : aiPanel === "explain" ? "📖 Explanation" : aiPanel === "feedback" ? "🔍 Code Feedback" : "AI Assistant"}
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
        </div>

        {/* Right panel — editor + results */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-primary)" }}>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 12px", color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
              {LANGUAGES.map((l) => <option key={l} value={l} style={{ background: "var(--bg-card)" }}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-secondary" style={{ padding: "6px 16px", fontSize: 13, background: "rgba(255,255,255,0.03)" }} onClick={handleRun} disabled={running || submitting}>
                {running ? "Running..." : "▶ Run"}
              </button>
              <button className="btn-primary" style={{ padding: "6px 20px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }} onClick={handleSubmit} disabled={running || submitting}>
                {submitting ? "Submitting..." : "☁ Submit"}
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <Editor
              height="100%"
              language={language === "cpp" ? "cpp" : language}
              value={code}
              onChange={(v) => setCode(v || "")}
              theme="vs-dark"
              options={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace", minimap: { enabled: false }, lineNumbers: "on", wordWrap: "on", scrollBeyondLastLine: false, padding: { top: 16 } }}
            />
          </div>

          {/* Results Panel */}
          {result && (
            <div style={{ height: "40%", minHeight: 250, borderTop: "1px solid var(--border)", background: "var(--bg-secondary)", display: "flex", flexDirection: "column" }}>
              
              {/* Large Status Header */}
              <div style={{ padding: "16px 20px" }}>
                          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: statusColor((result as any).status), display: "flex", alignItems: "center", gap: 8 }}>
                            {formatStatus((result as any).status)}
                            {((result as any).status === "RUNNING" || (result as any).status === "QUEUED" || (result as any).status === "PENDING") && (
                              <svg className="animate-spin" style={{ width: 16, height: 16, marginLeft: 4 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            )}
                          </h2>

                          {/* Show live progress message if executing */}
                          {(result as any).status === "RUNNING" && (result as any).message && (
                            <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-secondary)", background: "rgba(255,255,255,0.05)", padding: "10px 14px", borderRadius: 8, borderLeft: "3px solid var(--accent-blue)" }}>
                              <div style={{ fontWeight: 600, color: "white", marginBottom: 4 }}>
                                Execution Progress {(result as any)?.progress ? `(${(result as any).progress.current}/${(result as any).progress.total})` : ""}
                              </div>
                              {(result as any).message}
                            </div>
                          )}

                          {passedCount !== undefined && totalCount !== undefined && (result as any).status !== "RUNNING" && (result as any).status !== "QUEUED" && (result as any).status !== "PENDING" && (
                            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: 12, marginLeft: 16 }}>
                              {passedCount} / {totalCount} testcases passed
                            </span>
                          )}
                          {result.runtime != null && (result as any).status !== "RUNNING" && (result as any).status !== "QUEUED" && (result as any).status !== "PENDING" && (
                            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: 12, marginLeft: 8 }}>
                              Runtime: {result.runtime} ms
                            </span>
                          )}
                        </div>

              {/* Results Toolbar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: "1px solid var(--border)", marginTop: 8 }}>
                <div style={{ display: "flex" }}>
                  <button onClick={() => setResultsTab("testcases")} style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", border: "none", background: "transparent", color: resultsTab === "testcases" ? "var(--text-primary)" : "var(--text-muted)", borderBottom: resultsTab === "testcases" ? "2px solid var(--accent-purple)" : "2px solid transparent" }}>
                    Test Cases
                  </button>
                  <button onClick={() => setResultsTab("console")} style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", border: "none", background: "transparent", color: resultsTab === "console" ? "var(--text-primary)" : "var(--text-muted)", borderBottom: resultsTab === "console" ? "2px solid var(--accent-purple)" : "2px solid transparent" }}>
                    Console
                  </button>
                </div>
              </div>

              {/* Results Content */}
              <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                {resultsTab === "testcases" && (
                  <div>
                    {testResults && testResults.length > 0 ? (
                      <>
                        {/* Test case tab switcher */}
                        <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
                          {testResults.map((tr, idx) => (
                            <button key={idx} onClick={() => setActiveTestIndex(idx)}
                              style={{
                                padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                                fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap",
                                background: activeTestIndex === idx ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                                border: `1px solid ${activeTestIndex === idx ? "rgba(255,255,255,0.2)" : "transparent"}`,
                                color: tr.passed ? "var(--green)" : "var(--red)",
                              }}>
                              {tr.passed ? "✓" : "✗"} Case {idx + 1}
                            </button>
                          ))}
                        </div>

                        {/* Active test detail */}
                        {activeTest && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                            {/* Error badge — shown for any failure type */}
                            {(activeTest.errorDetails || activeTest.stderr || activeTest.compileOutput) && (
                              <div style={{ background: "rgba(239,68,68,0.06)", padding: "14px 16px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.25)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: activeTest.errorDetails?.message ? 10 : 0 }}>
                                  <span style={{ fontSize: 14, fontWeight: 700, color: "#f97316" }}>
                                    {activeTest.errorDetails?.verdict ?? (activeTest.compileOutput ? "Compile Error" : "Runtime Error")}
                                  </span>
                                  {activeTest.errorDetails?.errorType && (
                                    <span style={{ fontSize: 12, padding: "2px 8px", background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 12, color: "#fca5a5", fontFamily: "'JetBrains Mono', monospace" }}>
                                      {activeTest.errorDetails.errorType}
                                    </span>
                                  )}
                                  {activeTest.errorDetails?.line != null && (
                                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Line {activeTest.errorDetails.line}</span>
                                  )}
                                </div>
                                {activeTest.errorDetails?.message && (
                                  <div style={{ fontSize: 13, color: "#fca5a5", fontFamily: "'JetBrains Mono', monospace", background: "rgba(0,0,0,0.25)", padding: "8px 12px", borderRadius: 6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                    {activeTest.errorDetails.message}
                                  </div>
                                )}
                                {(activeTest.compileOutput || activeTest.stderr) && (
                                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>Full stack trace in Console tab ↑</div>
                                )}
                              </div>
                            )}

                            {/* Input — ALWAYS visible */}
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Input</div>
                              <div style={{ background: "var(--bg-primary)", padding: "10px 12px", borderRadius: 6, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary)", wordBreak: "break-all", whiteSpace: "pre-wrap" }}>{activeTest.input}</div>
                            </div>

                            {/* Stdout — shown only when non-null */}
                            {activeTest.stdout && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Stdout</div>
                                <div style={{ background: "var(--bg-primary)", padding: "10px 12px", borderRadius: 6, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary)", wordBreak: "break-all", whiteSpace: "pre-wrap" }}>{activeTest.stdout}</div>
                              </div>
                            )}

                            {/* Your Output — red for WA/error, green for AC */}
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: activeTest.passed ? "var(--green)" : "var(--red)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                {activeTest.passed ? "Output" : "Your Output"}
                              </div>
                              <div style={{
                                background: activeTest.passed ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)",
                                border: `1px solid ${activeTest.passed ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                                padding: "10px 12px", borderRadius: 6, fontSize: 13,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: activeTest.passed ? "var(--green)" : "var(--red)",
                                wordBreak: "break-all", whiteSpace: "pre-wrap",
                              }}>
                                {activeTest.actual !== null && activeTest.actual !== undefined ? activeTest.actual : "(no output)"}
                              </div>
                            </div>

                            {/* Expected — always shown */}
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Expected</div>
                              <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", padding: "10px 12px", borderRadius: 6, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: "var(--green)", wordBreak: "break-all", whiteSpace: "pre-wrap" }}>
                                {activeTest.expected}
                              </div>
                            </div>

                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ color: "var(--text-muted)", fontSize: 14, textAlign: "center", marginTop: 20 }}>No test cases executed yet.</div>
                    )}
                  </div>
                )}

                {resultsTab === "console" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {activeTest?.compileOutput && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#eab308", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Compile Output</div>
                        <pre style={{ background: "rgba(234,179,8,0.05)", padding: 12, borderRadius: 6, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "#eab308", overflowX: "auto", margin: 0, whiteSpace: "pre-wrap" }}>{activeTest.compileOutput}</pre>
                      </div>
                    )}
                    {activeTest?.stderr && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--red)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Standard Error</div>
                        <pre style={{ background: "rgba(239,68,68,0.05)", padding: 12, borderRadius: 6, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "#fca5a5", overflowX: "auto", margin: 0, whiteSpace: "pre-wrap" }}>{activeTest.stderr}</pre>
                      </div>
                    )}
                    {!activeTest?.compileOutput && !activeTest?.stderr && (
                      <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", marginTop: 20, fontFamily: "'JetBrains Mono', monospace" }}>No console output generated.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
