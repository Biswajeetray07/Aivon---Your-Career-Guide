/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, use, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
  getProblem, createSubmission, getSubmission,
  getCodeFeedback,
  runCodeApi, explainError, getAlternativeApproach, chatWithAI,
  type Problem, type RunResult,
} from "@/lib/api";
import { useJudgeSocket, type JudgeEvent } from "@/hooks/useJudgeSocket";
import VerdictHeader from "@/components/result/VerdictHeader";
import TestExplorer from "@/components/result/TestExplorer";

import AiFloatingPanel, { type AiPanelMode, type ErrorExplanation, type PerformanceReview, type ImproveExplanation } from "@/components/ai/AiFloatingPanel";
import ParsedMarkdown from "@/components/ui/ParsedMarkdown";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusDot } from "@/components/ui/badge";
import { Play, UploadCloud, Terminal as TerminalIcon, Sparkles, BookOpen, SearchCode, Bug } from "lucide-react";

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
  min = 300,
  max = 800
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
  max = 600
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
  const desc = useHorizontalResize(descRef, 500, 300, 800);
  // Resizable terminal
  const term = useVerticalResize(containerRef, 300, 140, 600);

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

    setTerminalOpen(true);

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
    <div className="min-h-screen pt-24 bg-[var(--background)] text-[var(--text-primary)] relative flex items-center justify-center">
      <div className="font-mono text-sm tracking-widest uppercase animate-pulse flex items-center gap-3">
        <StatusDot animate colorClass="bg-[var(--primary)]" /> Loading System Parameters...
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full pt-[72px] bg-[var(--background)] text-[var(--text-primary)] font-space-grotesk overflow-hidden relative">

      <div className="flex h-full w-full max-w-[1920px] mx-auto overflow-hidden">
        
        {/* ── Description panel ─────────────────────────────────────────── */}
        <div
          ref={descRef}
          className="flex flex-col shrink-0 border-r border-[var(--border)] glass"
          style={{
            width: isSmallScreen ? "100%" : desc.width,
            height: "100%",
          }}
        >
          {/* Description tab bar */}
          <div className="flex h-12 bg-[var(--background)]/80 border-b border-[var(--border)] shrink-0 font-mono text-xs uppercase tracking-widest relative z-10">
            {(["description", "ai"] as const).map((tab) => (
              <button key={tab} onClick={() => setDescTab(tab)}
                className={`flex-1 h-full flex items-center justify-center gap-2 font-bold transition-all duration-300 border-b-2 ${descTab === tab ? "text-[var(--primary)] border-[var(--primary)] bg-[var(--primary)]/10 shadow-[inset_0_-2px_10px_rgba(138,43,226,0.2)]" : "text-[var(--text-secondary)] border-transparent hover:bg-[var(--background)] hover:text-[var(--text-primary)]"}`}>
                {tab === "description" ? <><BookOpen size={14} /> Description</> : <><Sparkles size={14} /> AI Assistant</>}
              </button>
            ))}
          </div>

          {/* Description content */}
          <div className="flex-1 overflow-y-auto w-full relative">
            {descTab === "description" ? (
              <div className="p-6 md:p-8 w-full prose prose-invert prose-p:text-[var(--text-secondary)] prose-h2:text-[var(--text-primary)] prose-h3:text-[var(--text-primary)] prose-a:text-[var(--accent-cyan)] prose-code:text-[var(--primary)] max-w-none">
                <h1 className="text-2xl font-bold mb-4 tracking-tight text-gradient">
                  {problem.title.replace(/-/g, " ")}
                </h1>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${
                    problem.difficulty.toUpperCase() === "EASY" ? "text-green-400 border-green-500/30 bg-green-500/10" :
                    problem.difficulty.toUpperCase() === "MEDIUM" ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" :
                    "text-red-400 border-red-500/30 bg-red-500/10"
                  }`}>
                    {problem.difficulty}
                  </span>
                  {(problem.tags || []).map((tag) => (
                    <span key={tag} className="text-[10px] bg-[var(--background)]/50 border border-[var(--border)] rounded px-2 py-1 text-[var(--text-secondary)] uppercase font-mono tracking-wider">{tag}</span>
                  ))}
                </div>

                {/* AI action buttons */}
                <div className="flex flex-wrap gap-3 mb-8">
                  <button onClick={() => handleSideAI("hint")} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)] text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--primary)] hover:text-[var(--background)] transition-all shadow-[0_0_10px_var(--glow-color)]">
                    <Sparkles size={12} /> Hint
                  </button>
                  <button onClick={() => handleSideAI("explain")} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--accent-cyan)] hover:text-[var(--background)] transition-all shadow-[0_0_10px_rgba(0,229,255,0.3)]">
                    <BookOpen size={12} /> Explain
                  </button>
                </div>

                {/* Problem description */}
                <div className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
                  {problem.description}
                </div>

                {problem.constraints && (
                  <div className="mt-10 pt-8 border-t border-[var(--border)]">
                    <h3 className="text-sm font-bold mb-4 text-[var(--text-primary)] uppercase tracking-widest">System Constraints</h3>
                    <div className="bg-[var(--background)]/80 border border-[var(--border)] rounded-xl p-4 textxs text-[var(--text-secondary)] font-mono leading-relaxed">
                      {problem.constraints}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* AI Chat Interface */
              <div className="flex flex-col h-full bg-[var(--background)]/40 relative">
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                  {chatHistory.length === 1 && chatHistory[0].role === "assistant" ? (
                    <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto animate-fade-in-up">
                      <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center text-2xl mb-6 shadow-[0_0_30px_var(--glow-color)]">
                        🤖
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">Aivon Learning Brain</h3>
                      <p className="text-sm text-[var(--text-secondary)] mb-8">
                        I&apos;m your personal operative assistant for <span className="text-[var(--primary)]">{problem.title}</span>.
                      </p>

                      <div className="w-full space-y-3">
                        {[
                          { icon: <Sparkles size={16}/>, text: "Need a hint", prompt: "I'm stuck. Can you give me a small hint to get started without giving the full solution?" },
                          { icon: <BookOpen size={16}/>, text: "Explain mathematically", prompt: "Can you explain the mathematical or logical intuition behind this problem?" },
                          { icon: <SearchCode size={16}/>, text: "Optimize complexity", prompt: "My current approach might be too slow. How can I optimize the time and space complexity?" },
                          { icon: <Bug size={16}/>, text: "Debug my code", prompt: "My code is failing or hitting an error. Can you help me debug?" }
                        ].map((action, i) => (
                          <button 
                            key={i}
                            onClick={() => handleChatSubmit(undefined, action.prompt)}
                            className="w-full flex items-center gap-4 bg-[var(--card)]/50 border border-[var(--border)] hover:border-[var(--primary)]/50 p-4 rounded-xl text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--primary)] transition-all group shadow-md"
                          >
                            <span className="text-[var(--primary)] group-hover:scale-110 transition-transform">{action.icon}</span>
                            <span className="flex-1 text-left">{action.text}</span>
                            <span className="text-[var(--border)] group-hover:text-[var(--primary)] transition-colors opacity-50 group-hover:opacity-100 group-hover:translate-x-1 duration-300">→</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    chatHistory.map((msg, idx) => {
                      if (msg.role === "assistant" && idx === 0) return null;
                      
                      const isUser = msg.role === "user";
                      return (
                      <div key={idx} className={`relative max-w-[85%] ${isUser ? 'ml-auto' : 'mr-auto'}`}>
                        {!isUser && (
                          <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-[var(--background)] border border-[var(--primary)]/50 flex items-center justify-center text-[10px] z-10 shadow-[0_0_10px_var(--glow-color)]">
                            🤖
                          </div>
                        )}
                        <GlassCard hoverLift={!isUser} className={`p-4 md:p-5 text-sm ${isUser ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--text-primary)] rounded-tr-none' : 'bg-[var(--card)]/80 border-[var(--border)] text-[var(--text-secondary)] rounded-tl-none prose prose-invert prose-sm max-w-none prose-p:leading-relaxed'}`}>
                          {isUser ? msg.content : <ParsedMarkdown text={msg.content} />}
                        </GlassCard>
                      </div>
                      );
                    })
                  )}
                  
                  {chatLoading && (
                    <div className="flex items-center gap-3 p-4 max-w-[85%] bg-[var(--card)]/50 border border-[var(--border)] rounded-2xl rounded-tl-none relative mr-auto">
                        <div className="flex gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" />
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:-0.3s]" />
                        </div>
                        <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">Parsing...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                {/* Chat Input Field */}
                <form onSubmit={handleChatSubmit} className="flex gap-3 p-4 bg-[var(--background)]/80 border-t border-[var(--border)] shrink-0">
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Terminal prompt..."
                    disabled={chatLoading}
                    className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] font-mono outline-none transition-all focus:border-[var(--primary)] placeholder:text-[var(--text-muted)]"
                  />
                  {chatLoading ? (
                    <button 
                      type="button"
                      onClick={() => abortControllerRef.current?.abort()}
                      className="px-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                    >
                      Stop
                    </button>
                  ) : (
                    <button type="submit" disabled={!chatInput.trim()} className="px-6 rounded-xl bg-[var(--primary)] text-[var(--background)] text-xs font-bold uppercase tracking-widest hover:scale-105 hover:shadow-[0_0_15px_var(--glow-color)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none">
                      Send
                    </button>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>

        {/* ── Horizontal resize handle ──────────────────────────────────── */}
        {!isSmallScreen && <ResizeHandleH onMouseDown={desc.startResize} />}

        {/* ── Right panel: editor + terminal ──────────────────────────── */}
        <div
          ref={containerRef}
          className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10"
          style={{ minHeight: isSmallScreen ? 600 : 0 }}
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2">
              {/* Mac Window Dots */}
              <div className="hidden sm:flex items-center gap-1.5 mr-4">
                <div className="w-3 h-3 rounded-full bg-red-500/80 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/80 border border-green-500/50" />
              </div>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}
                className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] font-mono uppercase tracking-widest cursor-pointer outline-none hover:border-[var(--primary)]/50 transition-colors">
                {LANGUAGES.map((l) => <option key={l} value={l} className="bg-[var(--background)]">{l.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleRun} disabled={running || submitting}
                className="flex items-center gap-2 px-4 py-1.5 bg-[var(--card)] border border-[var(--border)] text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all hover:bg-[var(--background)] hover:border-[var(--text-muted)] disabled:opacity-50">
                {running ? <span className="typing-cursor">Running</span> : <><Play size={12}/> Run</>}
              </button>
              <button 
                onClick={handleSubmit} disabled={running || submitting}
                className="flex items-center gap-2 px-4 py-1.5 bg-[var(--primary)] border border-transparent text-[var(--background)] text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all hover:scale-105 hover:shadow-[0_0_15px_var(--glow-color)] disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none">
                {submitting ? <span className="typing-cursor">Submitting</span> : <><UploadCloud size={12}/> Submit</>}
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--primary)]/5 to-transparent pointer-events-none z-10" />
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
                renderLineHighlight: "all",
                cursorBlinking: "smooth",
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                }
              }}
            />
          </div>

          {/* ── Terminal section ────────────────────────────────────────── */}
          {result && (
            <>
              {terminalOpen && <ResizeHandleV onMouseDown={term.startResize} />}

              <div
                className="flex flex-col shrink-0 border-t border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl transition-all duration-300 relative z-20"
                style={{ height: terminalOpen ? term.height : 0 }}
              >
                {terminalOpen && (
                  <>
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

                    <TerminalTabBar
                      onToggleTerminal={() => setTerminalOpen(false)}
                      testResults={testResults}
                      isAccepted={isAccepted}
                      isFailure={isFailureVerdict}
                      onExplainError={() => { if (testResults) triggerExplainError(testResults, currentStatus); }}
                      onPerformance={triggerPerformanceReview}
                      onImprove={triggerImproveApproach}
                    />

                    <div className="flex-1 overflow-y-auto w-full test-cases-scrollbar">
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

              {!terminalOpen && (
                <button
                  onClick={() => setTerminalOpen(true)}
                  className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-[var(--card)]/80 backdrop-blur-md border border-[var(--border)] rounded-lg text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)]/50 transition-all shadow-lg z-50 group"
                >
                  <TerminalIcon size={14} className="group-hover:scale-110 transition-transform" /> Console
                </button>
              )}
            </>
          )}
        </div>
      </div>

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

function ResizeHandleH({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`w-1 cursor-col-resize shrink-0 relative z-10 transition-colors duration-150 ${hover ? 'bg-[var(--primary)]/50' : 'bg-transparent'}`}
    >
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-10 rounded-full transition-all duration-150 ${hover ? 'bg-[var(--primary)] h-16' : 'bg-[var(--text-muted)]'}`} />
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
      className={`h-1.5 cursor-row-resize shrink-0 flex items-center justify-center transition-colors duration-150 ${hover ? 'bg-[var(--primary)]/30' : 'bg-[var(--border)]'}`}
    >
      <div className={`w-10 h-0.5 rounded-full transition-all duration-150 ${hover ? 'bg-[var(--primary)] w-16' : 'bg-transparent'}`} />
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
    <div className="flex items-center justify-between px-4 min-h-[46px] border-b border-[var(--border)] bg-[var(--background)] shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest font-mono mr-2">Terminal Out</span>
      </div>
      <div className="flex gap-2 items-center">
        {isFailure && testResults && testResults.length > 0 && (
          <QuickBtn label="Explain Error" color="var(--accent-red)" icon={<Bug size={10} />} onClick={onExplainError} />
        )}
        {isAccepted && (
          <>
            <QuickBtn label="Performance" color="var(--accent-green)" icon={<Sparkles size={10} />} onClick={onPerformance} />
            <QuickBtn label="Improve" color="var(--accent-cyan)" icon={<SearchCode size={10} />} onClick={onImprove} />
          </>
        )}
        <div className="w-px h-4 bg-[var(--border)] mx-1" />
        <button
          onClick={onToggleTerminal}
          className="px-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          ▼ Hide
        </button>
      </div>
    </div>
  );
}

function QuickBtn({ label, color, icon, onClick }: { label: string; color: string; icon?: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        color,
        background: `${color}10`,
        borderColor: `${color}30`
      }}
      className="flex items-center gap-1.5 px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-md border transition-all hover:bg-opacity-20 hover:scale-105"
    >
      {icon && icon} {label}
    </button>
  );
}
