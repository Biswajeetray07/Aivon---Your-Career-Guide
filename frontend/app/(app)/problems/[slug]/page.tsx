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
import Link from "next/link";
import { useJudgeSocket, type JudgeEvent } from "@/hooks/useJudgeSocket";
import VerdictHeader from "@/components/result/VerdictHeader";
import TestExplorer from "@/components/result/TestExplorer";

import AiFloatingPanel, { type AiPanelMode, type ErrorExplanation, type PerformanceReview, type ImproveExplanation } from "@/components/ai/AiFloatingPanel";
import ParsedMarkdown from "@/components/ui/ParsedMarkdown";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusDot } from "@/components/ui/badge";
import { HackerBackground } from "@/components/ui/hacker-background";
import { Play, UploadCloud, Terminal as TerminalIcon, Sparkles, BookOpen, SearchCode, Bug } from "lucide-react";
import { useEditorContext } from "@/stores/useEditorContext";
import { copilot, CopilotManager } from "@/lib/copilot";

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

  // Editor context store (for AI awareness)
  const editorCtx = useEditorContext();

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
      editorCtx.setProblem(p.id, p.title, p.description || '');
    });
  }, [slug]);

  useEffect(() => {
    if (!problem) return;
    const sc = problem.starterCode as Record<string, string>;
    setCode(sc?.[language] || `// Write your ${language} solution here\n`);
    editorCtx.setCode(sc?.[language] || '', language);
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
      // Update editor context with last run info
      const runTestResults = runRes?.testResults;
      const firstFail = runTestResults?.find((t: any) => !t.passed);
      editorCtx.setLastRun({
        status: runRes?.status || 'UNKNOWN',
        stderr: firstFail?.stderr || undefined,
        stdout: firstFail?.stdout || undefined,
        failingTest: firstFail ? `Input: ${firstFail.input} | Expected: ${firstFail.expected} | Got: ${firstFail.actual}` : undefined,
      });
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
    
    const signal = copilot.getSignal();

    try {
      const data = await chatWithAI(problem.id, newMessages, code, language, signal, undefined, { lastRun: editorCtx.lastRun || undefined });
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

    const codeHash = CopilotManager.hashCode(code);
    const cached = copilot.getCachedResponse(problem.id, codeHash, inputToUse);
    if (cached) {
      setChatHistory([...newMessages, { role: "assistant" as const, content: cached }]);
      setChatLoading(false);
      return;
    }

    const signal = copilot.getSignal();
    copilot.markRequest();

    try {
      const data = await chatWithAI(problem.id, newMessages, code, language, signal, undefined, { lastRun: editorCtx.lastRun || undefined });
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
    <div className="h-screen w-full bg-transparent text-[var(--text-primary)] font-geist-mono overflow-hidden relative">
      <HackerBackground />

      <div className="flex flex-col h-full w-full max-w-[1920px] mx-auto overflow-hidden relative z-10 p-2 gap-2 animate-fade-in-up">
        
        {/* ── Top Bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between shrink-0 bg-[#060D10]/80 backdrop-blur-md border border-white/5 rounded-xl p-3 shadow-sm">
          <Link href="/problems" className="flex items-center gap-2 text-[#00E5B0] hover:text-white transition-colors uppercase tracking-widest text-[10px] font-bold group">
            <span className="opacity-50 group-hover:-translate-x-1 transition-transform">[</span>
            ⟵ RETURN TO MATRIX
            <span className="opacity-50 group-hover:translate-x-1 transition-transform">]</span>
          </Link>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-[#00E5B0] animate-pulse" />
             <span className="text-[10px] uppercase font-bold tracking-widest text-[#00E5B0]">SYS.ONLINE</span>
          </div>
        </div>

        {/* ── Main content bento grid ─────────────────────────────────── */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 relative">
          
          {/* ── Description panel (Mission Briefing) ────────────────── */}
          <div
            ref={descRef}
            className="flex flex-col shrink-0 border border-white/5 bg-[#060D10]/80 backdrop-blur-md rounded-xl overflow-hidden shadow-sm lg:h-full"
            style={{
              width: isSmallScreen ? "100%" : desc.width,
              height: "100%",
              animationDelay: "0.1s"
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
                <div className="flex flex-wrap gap-4 mb-8">
                  <button onClick={() => handleSideAI("hint")} className="relative group overflow-hidden flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/5 bg-[#0A0F14]/80 text-[#00C2FF] text-[11px] font-bold uppercase tracking-[0.15em] hover:border-white/5 hover:text-white transition-all shadow-sm hover:shadow-sm">
                    <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#00C2FF] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <Sparkles size={14} className="group-hover:animate-pulse" /> [ REQUEST HINT ]
                  </button>
                  <button onClick={() => handleSideAI("explain")} className="relative group overflow-hidden flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/5 bg-[#0A0F14]/80 text-[#00E5B0] text-[11px] font-bold uppercase tracking-[0.15em] hover:border-white/5 hover:text-white transition-all shadow-sm hover:shadow-sm">
                    <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#00E5B0] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <BookOpen size={14} className="group-hover:animate-pulse" /> [ EXPLAIN TASK ]
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
              <div className="flex flex-col h-full bg-[#05070A] relative font-geist-mono">
                <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(ellipse_at_top,#00E5B0_0%,transparent_70%)]" />
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 relative z-10 scrollbar-thin scrollbar-thumb-[#00E5B0]/20 scrollbar-track-transparent">
                  {chatHistory.length === 1 && chatHistory[0].role === "assistant" ? (
                    <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto animate-fade-in-up">
                      <div className="w-16 h-16 rounded-sm bg-[#060D10] border border-white/5 shadow-sm flex items-center justify-center text-2xl mb-6 font-mono text-[#00E5B0] relative">
                         <div className="absolute inset-0 border border-[#00E5B0] animate-pulse opacity-20" />
                         AI
                      </div>
                      <h3 className="text-sm tracking-[0.2em] uppercase font-bold text-[#00E5B0] mb-2 drop-shadow-sm">Neural Link Active</h3>
                      <p className="text-xs text-[#00E5B0]/60 mb-8 font-mono tracking-wide">
                        Awaiting instructions for <span className="text-[#00C2FF] font-bold">[{problem.title}]</span>_
                      </p>

                      <div className="w-full space-y-3">
                        {[
                          { icon: <Sparkles size={14}/>, text: "REQUEST HINT", prompt: "I'm stuck. Can you give me a small hint to get started without giving the full solution?" },
                          { icon: <BookOpen size={14}/>, text: "EXPLAIN MATH", prompt: "Can you explain the mathematical or logical intuition behind this problem?" },
                          { icon: <SearchCode size={14}/>, text: "OPTIMIZE O(N)", prompt: "My current approach might be too slow. How can I optimize the time and space complexity?" },
                          { icon: <Bug size={14}/>, text: "DEBUG SCRIPT", prompt: "My code is failing or hitting an error. Can you help me debug?" }
                        ].map((action, i) => (
                          <button 
                            key={i}
                            onClick={() => handleChatSubmit(undefined, action.prompt)}
                            className="w-full flex items-center gap-4 bg-[#060D10] border border-white/5 hover:border-white/5 p-3 rounded-none text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[#00E5B0] transition-all group shadow-md"
                          >
                            <span className="text-[#00E5B0] group-hover:scale-110 transition-transform">{action.icon}</span>
                            <span className="flex-1 text-left">&gt; {action.text}</span>
                            <span className="text-[var(--border)] group-hover:text-[#00E5B0] transition-colors opacity-50 group-hover:opacity-100 group-hover:translate-x-1 duration-300">_</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    chatHistory.map((msg, idx) => {
                      if (msg.role === "assistant" && idx === 0) return null;
                      
                      const isUser = msg.role === "user";
                      return (
                      <div key={idx} className={`relative w-full flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-5 text-[13px] font-mono max-w-[90%] border ${
                          isUser 
                            ? 'border-white/5 bg-[#060D10]/90 text-white rounded-tl-2xl rounded-tr-sm rounded-br-2xl rounded-bl-2xl shadow-sm' 
                            : 'border-white/5 bg-[#0A0F14]/90 text-white/80 rounded-tr-2xl rounded-tl-sm rounded-bl-2xl rounded-br-2xl shadow-sm prose-h2:text-white prose-h3:text-white prose-strong:text-[#00E5B0] prose-code:text-[#00C2FF] prose prose-invert max-w-none'
                        }`}>
                          <div className={`text-[10px] uppercase tracking-[0.2em] font-bold mb-3 flex items-center gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                              {isUser ? (
                                <>
                                  <span className="text-[#00C2FF]/60">OPERATIVE //</span>
                                  <span className="w-1.5 h-1.5 rounded-[1px] bg-[#00C2FF] shadow-[0_0_5px_#00C2FF]" />
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-[1px] bg-[#00E5B0] shadow-[0_0_5px_#00E5B0] animate-pulse" />
                                  <span className="text-[#00E5B0]/60">NEXUS // AI</span>
                                </>
                              )}
                           </div>
                          <div className={isUser ? "leading-relaxed break-words" : ""}>
                            {isUser ? msg.content : <ParsedMarkdown text={msg.content} />}
                          </div>
                        </div>
                      </div>
                      );
                    })
                  )}
                  
                  {chatLoading && (
                    <div className="flex w-full justify-start">
                        <div className="p-4 text-xs font-mono border-l-2 border-[#00E5B0] bg-[#00E5B0]/5 text-[#00E5B0] flex items-center gap-3">
                            <span className="text-[9px] uppercase tracking-widest font-bold opacity-50">SYS // </span>
                            <span className="typing-cursor">COMPUTING</span>
                        </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                {/* Chat Input Field */}
                <form onSubmit={handleChatSubmit} className="flex gap-2 p-3 bg-[#060D10] border-t border-white/5 shrink-0 relative z-10 w-full">
                  <div className="flex-1 flex items-center bg-[#05070A] border border-white/10 focus-within:border-white/5 focus-within:shadow-sm transition-all rounded-lg overflow-hidden relative">
                    <span className="text-[#00E5B0] pl-4 font-mono text-[13px] font-bold">&gt;</span>
                    <input 
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Enter command..."
                      disabled={chatLoading}
                      className="w-full bg-transparent px-3 py-3 md:py-4 text-[13px] text-white font-mono outline-none placeholder:text-white/20 placeholder:uppercase tracking-wide"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#00E5B0]/50 to-transparent opacity-0 focus-within:opacity-100 transition-opacity" />
                  </div>
                  {chatLoading ? (
                    <button 
                      type="button"
                      onClick={() => copilot.cancelPending()}
                      className="px-5 md:px-6 bg-[#FF5F56]/10 border border-white/5 text-[#FF5F56] text-[10px] md:text-[11px] font-bold uppercase tracking-[0.15em] hover:bg-[#FF5F56] hover:text-white transition-all rounded-lg shadow-[0_0_10px_rgba(255,95,86,0.1)]"
                    >
                      KILL
                    </button>
                  ) : (
                    <button type="submit" disabled={!chatInput.trim()} className="px-5 md:px-6 bg-[#00E5B0]/10 border border-white/5 text-[#00E5B0] text-[10px] md:text-[11px] font-bold uppercase tracking-[0.15em] hover:bg-[#00E5B0] hover:text-[#05070A] transition-all disabled:opacity-30 disabled:cursor-not-allowed rounded-lg shadow-sm">
                      EXECUTE
                    </button>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>
        {/* ── Horizontal resize handle ──────────────────────────────────── */}
        {!isSmallScreen && <ResizeHandleH onMouseDown={desc.startResize} />}

        {/* ── Right panel: Code Matrix & Terminal Output ───────────── */}
        <div
          ref={containerRef}
          className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10 lg:h-full"
          style={{ minHeight: isSmallScreen ? 600 : 0 }}
        >
          {/* Code Matrix */}
          <div className="flex-1 flex flex-col border border-white/5 bg-[#060D10]/80 backdrop-blur-md rounded-xl shadow-sm overflow-hidden relative">
          {/* Toolbar */}
          <div className="flex items-center justify-between h-14 px-4 border-b border-white/5 bg-[#0A0F14]/90 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              {/* Connection Status Dots */}
              <div className="hidden sm:flex items-center gap-1.5 mr-3 px-2 py-1 bg-black/50 rounded-sm border border-white/5">
                <div className="w-1.5 h-1.5 rounded-sm bg-[#00E5B0] animate-pulse shadow-[0_0_5px_#00E5B0]" />
                <div className="w-1.5 h-1.5 rounded-sm bg-white/20" />
                <div className="w-1.5 h-1.5 rounded-sm bg-white/20" />
              </div>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}
                className="bg-[#05070A] border border-white/5 rounded-sm px-3 py-1.5 text-[11px] text-[#00E5B0] font-mono uppercase tracking-[0.15em] cursor-pointer outline-none hover:border-white/5 transition-all focus:border-[#00E5B0] focus:shadow-sm">
                {LANGUAGES.map((l) => <option key={l} value={l} className="bg-[#05070A]">{l.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={handleRun} disabled={running || submitting}
                className="relative overflow-hidden flex items-center justify-center gap-2 bg-[#060D10] border border-white/5 text-[#00C2FF] px-5 py-2 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-[#0A1418] hover:border-white/5 hover:text-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group/runbtn">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00C2FF]/15 to-transparent -translate-x-full group-hover/runbtn:translate-x-full transition-transform duration-1000 z-0" />
                <span className="relative z-10 flex items-center justify-center w-3 h-3 mr-1">
                  <span className="absolute inset-0 border border-current rounded-full" />
                  <span className="w-1 h-1 bg-current rounded-full group-hover/runbtn:animate-ping" />
                </span>
                <span className="relative z-10">{running ? <span className="typing-cursor">COMPILING</span> : "COMPILE"}</span>
              </button>
              
              <button 
                onClick={handleSubmit} disabled={running || submitting}
                className="relative overflow-hidden flex items-center justify-center gap-2 bg-[#060D10] border border-white/5 text-[#00E5B0] px-6 py-2 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-[#0A1418] hover:border-white/5 hover:text-white hover:shadow-sm shadow-sm hover:shadow-sm disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed group/execbtn">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00E5B0]/15 to-transparent -translate-x-full group-hover/execbtn:translate-x-full transition-transform duration-1000 z-0" />
                <span className="relative z-10 flex items-center justify-center w-3 h-3 mr-1">
                  <span className="absolute inset-0 border border-current rounded-full" />
                  <span className="w-1 h-1 bg-current rounded-full group-hover/execbtn:animate-ping" />
                </span>
                <span className="relative z-10">{submitting ? <span className="typing-cursor font-bold">UPLOADING</span> : "EXECUTE"}</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-[#00E5B0]/5 to-transparent pointer-events-none z-10" />
            <Editor
              height="100%"
              language={language === "cpp" ? "cpp" : language}
              value={code}
              onChange={(v) => { setCode(v || ""); editorCtx.setCode(v || "", language); }}
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
          </div>

          {/* ── Terminal section (Detached Output) ───────────────────── */}
          {result && (
            <>
              {terminalOpen && <ResizeHandleV onMouseDown={term.startResize} />}

              <div className="flex flex-col shrink-0 border border-t border-[var(--border)] border-white/5 bg-[#060D10]/95 backdrop-blur-md rounded-xl shadow-sm transition-all duration-300 relative z-20 overflow-hidden" style={{ height: terminalOpen ? term.height : 0 }}>
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
                  className="absolute bottom-6 right-6 flex items-center justify-center gap-3 px-5 py-3 bg-[#060D10] border border-white/5 text-[#FACC15] text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-[#0A1418] hover:border-white/5 hover:text-white shadow-[0_0_20px_rgba(250,204,21,0.1)] group/termbtn z-50 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FACC15]/15 to-transparent -translate-x-full group-hover/termbtn:translate-x-full transition-transform duration-1000 z-0" />
                  <span className="relative z-10 flex items-center justify-center w-3 h-3 mr-1">
                    <span className="absolute inset-0 border border-current rounded-full" />
                    <span className="w-1 h-1 bg-current rounded-full group-hover/termbtn:animate-ping" />
                  </span>
                  <span className="relative z-10">CONSOLE_LOG</span>
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
      className={`w-2 cursor-col-resize shrink-0 relative z-10 transition-colors duration-150 ${hover ? 'bg-[#00E5B0]/50' : 'bg-transparent'}`}
    >
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-10 rounded-full transition-all duration-150 ${hover ? 'bg-[#00E5B0] h-16 shadow-[0_0_10px_#00E5B0]' : 'bg-[var(--text-muted)]'}`} />
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
      className={`h-2 cursor-row-resize shrink-0 flex items-center justify-center transition-colors duration-150 ${hover ? 'bg-[#00E5B0]/30' : 'bg-transparent'}`}
    >
      <div className={`w-10 h-0.5 rounded-full transition-all duration-150 ${hover ? 'bg-[#00E5B0] w-16 shadow-[0_0_10px_#00E5B0]' : 'bg-[var(--text-muted)]'}`} />
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
    <div className="flex items-center justify-between px-4 min-h-[46px] border-b border-white/5 bg-[#060D10]/95 shrink-0 relative overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-[#00E5B0]/0 via-[#00E5B0]/50 to-[#00E5B0]/0" />
      <div className="flex items-center gap-3">
        <span className="w-1.5 h-1.5 rounded-sm bg-[#00E5B0] animate-pulse shadow-[0_0_5px_#00E5B0]"/>
        <span className="text-[10px] font-bold text-[#00E5B0] uppercase tracking-[0.2em] font-mono mr-2">SYS.TERMINAL_OUT</span>
      </div>
      <div className="flex gap-4 items-center">
        {isFailure && testResults && testResults.length > 0 && (
          <button onClick={onExplainError} className="relative group overflow-hidden flex items-center gap-2 px-6 py-2 rounded-lg border border-white/5 bg-[#0A0F14]/80 text-[#FF5F56] text-[10px] font-bold uppercase tracking-[0.15em] hover:border-white/5 hover:text-white transition-all shadow-[0_0_15px_rgba(255,95,86,0.05)] hover:shadow-[0_0_20px_rgba(255,95,86,0.2)]">
            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#FF5F56] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Bug size={12} className="group-hover:animate-ping" /> DIAGNOSE ERROR
          </button>
        )}
        {isAccepted && (
          <>
            <button onClick={onPerformance} className="relative group overflow-hidden flex items-center gap-2 px-6 py-2 rounded-lg border border-white/5 bg-[#0A0F14]/80 text-[#00E5B0] text-[10px] font-bold uppercase tracking-[0.15em] hover:border-white/5 hover:text-white transition-all shadow-sm hover:shadow-sm">
              <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#00E5B0] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Sparkles size={12} className="group-hover:animate-pulse" /> PERFORMANCE
            </button>
            <button onClick={onImprove} className="relative group overflow-hidden flex items-center gap-2 px-6 py-2 rounded-lg border border-white/5 bg-[#0A0F14]/80 text-[#00C2FF] text-[10px] font-bold uppercase tracking-[0.15em] hover:border-white/5 hover:text-white transition-all shadow-sm hover:shadow-sm">
              <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#00C2FF] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <SearchCode size={12} className="group-hover:animate-pulse" /> ALT APPROACH
            </button>
          </>
        )}
        <div className="w-px h-6 bg-[var(--border)] mx-2 opacity-50" />
        <button
          onClick={onToggleTerminal}
          className="px-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-white transition-colors"
        >
          ▼ HIDE
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
      {icon}
      <span>{label}</span>
    </button>
  );
}
