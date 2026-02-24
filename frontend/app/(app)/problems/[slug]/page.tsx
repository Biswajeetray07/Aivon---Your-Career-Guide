/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, use, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import {
  getProblem, createSubmission, getSubmission,
  getHint, getCodeFeedback, getExplanation,
  runCodeApi, explainError, getAlternativeApproach, chatWithAI,
  type Problem, type RunResult,
} from "@/lib/api";
import { useJudgeSocket, type JudgeEvent } from "@/hooks/useJudgeSocket";
import VerdictHeader from "@/components/result/VerdictHeader";
import TestExplorer from "@/components/result/TestExplorer";

import AiFloatingPanel, { type AiPanelMode, type ErrorExplanation, type PerformanceReview, type ImproveExplanation } from "@/components/ai/AiFloatingPanel";
import ParsedMarkdown from "@/components/ui/ParsedMarkdown";
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
  // Chat state (replacing static AI side panel)
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant", content: string }[]>([
    { role: "assistant", content: "👋 Hi! I'm Aivon AI.\nI can help you understand the problem, debug code, or give hints.\nWhat would you like to explore?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (descTab === "ai" && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, descTab]);

  // Floating AI panel
  const [floatingMode, setFloatingMode] = useState<AiPanelMode | null>(null);
  const [floatingLoading, setFloatingLoading] = useState(false);
  const [floatingError, setFloatingError] = useState<ErrorExplanation | null>(null);
  const [floatingPerf, setFloatingPerf] = useState<PerformanceReview | null>(null);
  const [floatingImprove, setFloatingImprove] = useState<ImproveExplanation | null>(null);
  const [floatingApiError, setFloatingApiError] = useState<string | null>(null);

  // Responsive state
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  useEffect(() => {
    const check = () => setIsSmallScreen(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
      const sub = event.submission as { id: string, status: string, runtime: number | null, memory: number | null, details: any };
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
    });
  }, [slug]);

  useEffect(() => {
    if (!problem) return;
    const sc = problem.starterCode as Record<string, string>;
    setCode(sc?.[language] || `// Write your ${language} solution here\n`);
    setResult(null);
  }, [language, problem]);

  const getTestResults = useCallback((): TestResult[] | undefined => {
    if (resultMode === "submit") return (result as SubmissionResult)?.details?.testResults;
    return (result as RunResult)?.testResults;
  }, [resultMode, result]);

  // Auto-open terminal when result arrives, failure-first test selection
  useEffect(() => {
    if (!result) return;
    const status = (result as { status?: string }).status;
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
  }, [result, getTestResults]);

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
    setFloatingApiError(null);
    try {
      const ed = firstFail?.errorDetails;
      const payload = await explainError(
        problem.id, language, code,
        ed ?? { verdict: status, errorType: "RuntimeError", line: null, message: firstFail?.stderr ?? "" },
        { input: firstFail?.input, expected: firstFail?.expected, received: firstFail?.actual }
      );
      setFloatingError(payload);
    } catch (err: any) {
      setFloatingApiError(err.message || "Failed to generate explanation");
    } finally {
      setFloatingLoading(false);
    }
  }

  async function triggerPerformanceReview() {
    if (!problem) return;
    setFloatingMode("performance");
    setFloatingLoading(true);
    setFloatingPerf(null);
    setFloatingApiError(null);
    try {
      const data = await getCodeFeedback(problem.id, language, code);
      setFloatingPerf(data);
    } catch (err: any) {
      setFloatingApiError(err.message || "Failed to generate performance review");
    } finally {
      setFloatingLoading(false);
    }
  }

  async function triggerImproveApproach() {
    if (!problem) return;
    setFloatingMode("improve");
    setFloatingLoading(true);
    setFloatingImprove(null);
    setFloatingApiError(null);
    try {
      const data = await getAlternativeApproach(problem.id, language, code);
      setFloatingImprove(data);
    } catch (err: any) {
      setFloatingApiError(err.message || "Failed to generate alternative approach");
    } finally {
      setFloatingLoading(false);
    }
  }

  async function handleSideAI(type: "hint" | "explain") {
    if (!problem) return;
    setDescTab("ai");
    
    const prompt = type === "hint" ? "I need a hint for this problem." : "Can you explain this problem to me?";
    const newMessages = [...chatHistory, { role: "user" as const, content: prompt }];
    setChatHistory(newMessages);
    setChatLoading(true);
    
    abortControllerRef.current = new AbortController();

    try {
      const data = await chatWithAI(problem.id, newMessages, code, language, abortControllerRef.current.signal);
      if (data && data.reply) {
        setChatHistory([...newMessages, { role: "assistant" as const, content: data.reply }]);
      } else {
        setChatHistory([...newMessages, { role: "assistant" as const, content: "⚠️ Sorry, I encountered an error answering that." }]);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setChatHistory([...newMessages, { role: "assistant" as const, content: "🛑 Generation stopped by user." }]);
      } else {
        setChatHistory([...newMessages, { role: "assistant" as const, content: "⚠️ Network error. Please try again." }]);
      }
    } finally {
      setChatLoading(false);
      abortControllerRef.current = null;
    }
  }

  async function handleChatSubmit(e?: React.FormEvent, overrideInput?: string) {
    if (e) e.preventDefault();
    const inputToUse = overrideInput || chatInput;
    if (!inputToUse.trim() || !problem || chatLoading) return;

    const newMessages = [...chatHistory, { role: "user" as const, content: inputToUse }];
    setChatHistory(newMessages);
    if (!overrideInput) setChatInput("");
    setChatLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const data = await chatWithAI(problem.id, newMessages, code, language, abortControllerRef.current.signal);
      if (data && data.reply) {
        setChatHistory([...newMessages, { role: "assistant" as const, content: data.reply }]);
      } else {
        setChatHistory([...newMessages, { role: "assistant" as const, content: "⚠️ Sorry, I encountered an error answering that." }]);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setChatHistory([...newMessages, { role: "assistant" as const, content: "🛑 Generation stopped." }]);
      } else {
        setChatHistory([...newMessages, { role: "assistant" as const, content: "⚠️ Network error. Please try again." }]);
      }
    } finally {
      setChatLoading(false);
      abortControllerRef.current = null;
    }
  }

  const currentStatus = (result as { status?: string })?.status ?? "";
  const isAccepted = currentStatus === "ACCEPTED" || currentStatus === "Accepted";
  const isFailureVerdict = ["RUNTIME_ERROR", "COMPILATION_ERROR", "WRONG_ANSWER", "WRONG_ANSWER_ON_HIDDEN_TEST", "TIME_LIMIT_EXCEEDED", "MEMORY_LIMIT_EXCEEDED", "Runtime Error", "Compile Error", "Wrong Answer", "Wrong Answer on Hidden Test", "Time Limit Exceeded", "Memory Limit Exceeded", "Internal Error"].includes(currentStatus);

  const testResults = getTestResults();
  const passedCount = resultMode === "submit" ? ((result as SubmissionResult)?.details?.passedCases ?? (result as any)?.details?.passedCount) : (result as RunResult)?.passedCases;
  const totalCount = resultMode === "submit" ? (result as SubmissionResult)?.details?.totalCases : (result as RunResult)?.totalCases;

  if (!problem) return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
      <div style={{ color: "var(--text-muted)", fontSize: 16 }}>Loading problem...</div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#050505", color: "#fff", position: "relative" }}>
      {/* Interactive Cyber Background */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(circle at 50% -20%, rgba(138,43,226,0.15), transparent 60%), radial-gradient(circle at 120% 50%, rgba(0,255,255,0.08), transparent 50%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        pointerEvents: "none",
        zIndex: 0,
      }} />
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
          flexDirection: isSmallScreen ? "column" : "row",
          overflow: isSmallScreen ? "auto" : "hidden",
          transition: "margin-left 220ms cubic-bezier(0.4,0,0.2,1)",
          minWidth: 0,
        }}
      >
        {/* ── Description panel ─────────────────────────────────────────── */}
        <div
          ref={descRef}
          style={{
            width: isSmallScreen ? "100%" : desc.width,
            minWidth: isSmallScreen ? "100%" : 260,
            maxWidth: isSmallScreen ? "100%" : 680,
            display: "flex",
            flexDirection: "column",
            borderRight: isSmallScreen ? "none" : "1px solid rgba(255,255,255,0.05)",
            borderBottom: isSmallScreen ? "1px solid rgba(255,255,255,0.05)" : "none",
            background: "rgba(20, 20, 25, 0.4)",
            backdropFilter: "blur(12px)",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {/* Description tab bar */}
          <div style={{ display: "flex", height: 60, borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.4)", flexShrink: 0, position: "relative", zIndex: 10 }}>
            {(["description", "ai"] as const).map((tab) => (
              <button key={tab} onClick={() => setDescTab(tab)}
                style={{
                  flex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600,
                  fontFamily: "inherit", cursor: "pointer", border: "none",
                  background: descTab === tab ? "rgba(138,43,226,0.15)" : "transparent",
                  color: descTab === tab ? "#00FFFF" : "#a1a1aa",
                  borderBottom: descTab === tab ? "2px solid #00FFFF" : "2px solid transparent",
                  textShadow: descTab === tab ? "0 0 10px rgba(0,255,255,0.5)" : "none",
                  transition: "all 0.18s ease",
                }}>
                {tab === "description" ? "📄 Description" : "✨ AI Assistant"}
              </button>
            ))}
          </div>

          {/* Description content */}
          <div style={{ flex: 1, overflowY: descTab === "ai" ? "hidden" : "auto", padding: descTab === "ai" ? 0 : 20, display: "flex", flexDirection: "column" }}>
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
                  <button onClick={() => handleSideAI("hint")} style={{...glassBtnStyle, background: "linear-gradient(135deg, rgba(0,255,255,0.15), rgba(0,255,255,0.05))", border: "1px solid rgba(0,255,255,0.25)", color: "#00FFFF", boxShadow: "0 4px 12px rgba(0,255,255,0.1)"}}>
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
              /* AI Chat Interface */
              <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden", background: "rgba(0,0,0,0.2)" }}>
                <div className="test-cases-scrollbar" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20, padding: "24px 20px" }}>
                  {chatHistory.length === 1 && chatHistory[0].role === "assistant" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "20px 10px", alignItems: "center", justifyContent: "center", height: "100%" }}>
                      <div style={{ textAlign: "center", animation: "fadeIn 0.5s ease-out" }}>
                        <div style={{ fontSize: 48, marginBottom: 16, filter: "drop-shadow(0 0 20px rgba(0,229,255,0.4))" }}>🤖</div>
                        <h3 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 8, letterSpacing: "-0.02em" }}>Aivon Learning Brain v2</h3>
                        <p style={{ color: "var(--text-secondary)", fontSize: 15, maxWidth: 380, lineHeight: 1.6, margin: "0 auto" }}>
                          I'm your personal DSA mentor for <strong style={{ color: "var(--accent-cyan-light)" }}>{problem.title}</strong>. How can I help you today?
                        </p>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 400, animation: "slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                        {[
                          { icon: "💡", text: "I need a hint to get started", prompt: "I'm stuck. Can you give me a small hint to get started without giving the full solution?" },
                          { icon: "📖", text: "Explain this problem mathematically", prompt: "Can you explain the mathematical or logical intuition behind this problem?" },
                          { icon: "⏱️", text: "How do I optimize my complexity?", prompt: "My current approach might be too slow. How can I optimize the time and space complexity?" },
                          { icon: "🐛", text: "Help me debug my code", prompt: "My code is failing or hitting an error. Can you help me debug?" }
                        ].map((action, i) => (
                          <button 
                            key={i}
                            onClick={() => {
                              handleChatSubmit(undefined, action.prompt);
                            }}
                            style={{
                              display: "flex", alignItems: "center", gap: 14,
                              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                              padding: "16px 20px", borderRadius: 16, width: "100%",
                              color: "var(--text-primary)", fontSize: 14, fontWeight: 500, textAlign: "left",
                              cursor: "pointer", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0, 229, 255, 0.08)"; e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.3)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "none"; }}
                          >
                            <span style={{ fontSize: 20 }}>{action.icon}</span>
                            <span>{action.text}</span>
                            <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 18 }}>→</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    chatHistory.map((msg, idx) => {
                      // skip rendering the welcome message if there are other messages, to keep it clean.
                      if (msg.role === "assistant" && idx === 0) return null;
                      
                      const isUser = msg.role === "user";
                      return (
                      <div key={idx} style={{ 
                        alignSelf: isUser ? "flex-end" : "flex-start",
                        maxWidth: "75%",
                        background: isUser ? "linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(0, 229, 255, 0.05))" : "rgba(30, 30, 35, 0.6)",
                        border: `1px solid ${isUser ? "rgba(0, 229, 255, 0.25)" : "rgba(255, 255, 255, 0.08)"}`,
                        padding: "14px 18px",
                        borderRadius: "20px",
                        borderBottomRightRadius: isUser ? 4 : 20,
                        borderBottomLeftRadius: !isUser ? 4 : 20,
                        color: isUser ? "#fff" : "var(--text-primary)",
                        fontSize: 14,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
                        backdropFilter: "blur(10px)",
                        position: "relative"
                      }}>
                        {!isUser && (
                          <div style={{ position: "absolute", top: -12, left: -8, fontSize: 18, background: "#000", borderRadius: "50%", padding: 2 }}>
                            🤖
                          </div>
                        )}
                        {isUser ? msg.content : <ParsedMarkdown text={msg.content} />}
                      </div>
                    );
                  })
                  )}
                  
                  {chatLoading && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignSelf: "flex-start" }}>
                      <div style={{
                          background: "rgba(30, 30, 35, 0.6)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          padding: "14px 18px",
                          borderRadius: "20px",
                          borderBottomLeftRadius: 4,
                          display: "flex", alignItems: "center", gap: 10,
                          boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
                          backdropFilter: "blur(10px)"
                      }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <div style={{ width: 6, height: 6, background: "var(--accent-cyan)", borderRadius: "50%", animation: "bounce 1.4s infinite ease-in-out both" }} />
                          <div style={{ width: 6, height: 6, background: "var(--accent-cyan)", borderRadius: "50%", animation: "bounce 1.4s infinite ease-in-out both", animationDelay: "0.2s" }} />
                          <div style={{ width: 6, height: 6, background: "var(--accent-cyan)", borderRadius: "50%", animation: "bounce 1.4s infinite ease-in-out both", animationDelay: "0.4s" }} />
                        </div>
                        <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>Aivon is thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                {/* Chat Input Field */}
                <form onSubmit={handleChatSubmit} style={{ 
                  display: "flex", gap: 12, flexShrink: 0,
                  padding: "16px 20px", background: "rgba(0,0,0,0.6)", 
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  backdropFilter: "blur(12px)"
                }}>
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Message Aivon..."
                    disabled={chatLoading}
                    style={{
                      flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", 
                      outline: "none", borderRadius: 24, padding: "12px 20px",
                      color: "#fff", fontSize: 14, fontFamily: "'Inter', sans-serif",
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)"
                    }}
                  />
                  {chatLoading ? (
                    <button 
                      type="button"
                      onClick={() => abortControllerRef.current?.abort()}
                      style={{
                        background: "rgba(255,100,100,0.1)",
                        color: "#ff6b6b",
                        border: "1px solid rgba(255,100,100,0.3)", borderRadius: 24, padding: "0 20px", fontSize: 14, fontWeight: 700,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,100,100,0.2)" }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,100,100,0.1)" }}
                    >
                      <span>🛑</span> STOP
                    </button>
                  ) : (
                    <button type="submit" disabled={!chatInput.trim()} style={{
                      background: chatInput.trim() ? "linear-gradient(135deg, var(--accent-cyan), #00b8d4)" : "rgba(255,255,255,0.1)",
                      color: chatInput.trim() ? "#000" : "var(--text-muted)",
                      border: "none", borderRadius: 24, padding: "0 24px", fontSize: 14, fontWeight: 700,
                      cursor: chatInput.trim() ? "pointer" : "not-allowed",
                      transition: "all 0.2s", boxShadow: chatInput.trim() ? "0 4px 15px rgba(0, 229, 255, 0.3)" : "none"
                    }}>
                      SEND
                    </button>
                  )}
                </form>
                <style>{`
                  @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1); }
                  }
                  @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                  }
                  @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
              </div>
            )}
          </div>
        </div>

        {/* ── Horizontal resize handle ──────────────────────────────────── */}
        {!isSmallScreen && <ResizeHandleH onMouseDown={desc.startResize} />}

        {/* ── Right panel: editor + terminal ──────────────────────────── */}
        <div
          ref={containerRef}
          style={{ 
            flex: 1, 
            display: "flex", 
            flexDirection: "column", 
            overflow: "hidden", 
            minWidth: 0,
            minHeight: isSmallScreen ? 600 : 0, 
            background: "transparent",
            position: "relative", zIndex: 10 
          }}
        >
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, padding: "0 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)", flexShrink: 0 }}>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 16px", color: "#fff", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", outline: "none", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}>
              {LANGUAGES.map((l) => <option key={l} value={l} style={{ background: "#050505" }}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ padding: "8px 20px", fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }} onClick={handleRun} disabled={running || submitting}
                 onMouseEnter={e => { e.currentTarget.style.borderColor = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                 onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}>
                {running ? "EXECUTING..." : "▶ RUN LOCAL"}
              </button>
              <button style={{ padding: "8px 24px", fontSize: 13, fontWeight: 800, letterSpacing: "0.05em", background: "#39FF14", color: "#050505", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 15px rgba(57,255,20,0.2), inset 0 2px 0 rgba(255,255,255,0.2)", transition: "all 0.2s" }} onClick={handleSubmit} disabled={running || submitting}
                 onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(57,255,20,0.4), inset 0 2px 0 rgba(255,255,255,0.2)"; }}
                 onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 15px rgba(57,255,20,0.2), inset 0 2px 0 rgba(255,255,255,0.2)"; }}>
                {submitting ? "UPLOADING..." : "☁ SUBMIT PROTOCOL"}
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
                  borderTop: terminalOpen ? "1px solid rgba(255,255,255,0.05)" : "none",
                  background: "rgba(10, 10, 12, 0.8)",
                  backdropFilter: "blur(20px)",
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
                      progressCurrent={(result as { progress?: { current: number } }).progress?.current}
                      progressTotal={(result as { progress?: { total: number } }).progress?.total}
                      progressMessage={(result as { message?: string }).message}
                      mode={resultMode ?? undefined}
                    />

                    {/* Terminal tabs + controls */}
                    <TerminalTabBar
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
                    position: "absolute",
                    bottom: 16,
                    right: 24,
                    background: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(8px)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.1)",
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
                    display: "flex", alignItems: "center", gap: 8,
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#00FFFF"; e.currentTarget.style.color = "#00FFFF"; e.currentTarget.style.boxShadow = "0 0 15px rgba(0,255,255,0.2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.5)"; }}
                >
                  Console <span style={{ fontFamily: "'JetBrains Mono', monospace", opacity: 0.5, marginLeft: 4 }}>[CMD+J]</span>
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
          apiError={floatingApiError}
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
        background: hover ? "#00E5FF" : "rgba(255,255,255,0.12)",
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
        background: hover ? "#00E5FF" : "rgba(255,255,255,0.15)",
        transition: "background 150ms ease, width 150ms ease",
      }} />
    </div>
  );
}

function TerminalTabBar({
  onToggleTerminal,
  testResults, isAccepted, isFailure,
  onExplainError, onPerformance, onImprove,
}: {
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
            <QuickBtn label="🔀 Improve" color="#00FFFF" onClick={onImprove} />
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
