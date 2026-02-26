// Use relative path by default to route through Next.js proxy (which handles CORS)
const API = process.env.NEXT_PUBLIC_BACKEND_URL || "";
import type { ErrorExplanation, PerformanceReview, ImproveExplanation } from "@/components/ai/AiFloatingPanel";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("aivon_token");
}

function headers(extra: Record<string, string> = {}) {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function safeJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    // Server returned non-JSON (HTML error page, plain text, etc.)
    throw new Error(text.slice(0, 200) || `HTTP ${res.status}`);
  }
}

export async function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    cache: "no-store",
    signal,
  });
  const data = await safeJson(res);
  if (!res.ok) {
    const errData = data as { error?: string; message?: string } | null;
    throw new Error(errData?.error || errData?.message || `HTTP ${res.status}`);
  }
  return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers(), cache: "no-store" });
  const data = await safeJson(res);
  if (!res.ok) {
    const errData = data as { error?: string; message?: string } | null;
    throw new Error(errData?.error || errData?.message || `HTTP ${res.status}`);
  }
  return data as T;
}

// Auth
export const login = (email: string, password: string) =>
  apiPost<{ token: string; user: { id: string; email: string; name: string | null; role: string; rating: number } }>(
    "/api/auth/login", { email, password }
  );

export const register = (email: string, password: string, name?: string) =>
  apiPost<{ token: string; user: { id: string; email: string; name: string | null; role: string } }>(
    "/api/auth/register", { email, password, name }
  );

export const getSession = () =>
  apiGet<{ user: { id: string; email: string; name: string | null; role: string; rating: number; createdAt: string } }>(
    "/api/auth/session"
  );

// Problems
export interface Problem {
  id: string; title: string; slug: string; difficulty: "EASY" | "MEDIUM" | "HARD";
  description: string; starterCode: Record<string, string>; entryPoint: string;
  judgeMode?: "exact" | "unordered" | "float" | "multiline" | "spj";
  tags: string[]; examples: unknown; constraints: string | null;
  testCases: Array<{ id: string; input: string; expected: string; order: number }>;
}

export const listProblems = (params?: { difficulty?: string; tags?: string; search?: string; page?: number; limit?: number }) => {
  const qs = new URLSearchParams();
  if (params?.difficulty) qs.set("difficulty", params.difficulty);
  if (params?.tags) qs.set("tags", params.tags);
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  return apiGet<{ problems: Problem[]; total: number; page: number; limit: number }>(`/api/problems?${qs}`);
};

export const getProblem = (id: string) => apiGet<Problem>(`/api/problems/${id}`);

// Submissions
export const createSubmission = (problemId: string, language: string, code: string) =>
  apiPost<{ submissionId: string; status: string }>("/api/submissions", { problemId, language, code });

export interface RunResult {
  status: string;
  runtime: number | null;
  memory: number | null;
  testResults: Array<{
    input: string; expected: string; actual: string | null;
    stdout?: string | null;
    stderr: string | null; compileOutput: string | null;
    passed: boolean; runtime: number | null;
    errorDetails?: { verdict: string; errorType: string; line: number | null; message: string } | null;
  }>;
  passedCases: number;
  totalCases: number;
}

export const runCodeApi = (problemId: string, language: string, code: string) =>
  apiPost<RunResult>("/api/run", { problemId, language, code });

export const getSubmission = (id: string) =>
  apiGet<{ id: string; status: string; language: string; code: string; runtime: number | null; memory: number | null; details: unknown; createdAt: string; problem: { id: string; title: string; slug: string } }>(
    `/api/submissions/${id}`
  );

export interface SubmissionHistoryItem {
  id: string; status: string; language: string;
  runtime: number | null; memory: number | null;
  details: { passedCases?: number; totalCases?: number } | null;
  createdAt: string;
  problem: { id: string; title: string; slug: string; difficulty: string };
}

export const getMySubmissions = (params?: { limit?: number }) => {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  return apiGet<{ submissions: SubmissionHistoryItem[] }>(`/api/submissions/my?${qs}`);
};


// Leaderboard
export const getLeaderboard = () =>
  apiGet<{ leaderboard: Array<{ rank: number; userId: string; name: string | null; email: string; rating: number; solved: number }> }>(
    "/api/leaderboard"
  );

// Stats
export const getMyStats = () =>
  apiGet<{ totalSolved: number; totalSubmissions: number; accuracy: number; byDifficulty: { EASY: number; MEDIUM: number; HARD: number }; recentActivity: SubmissionHistoryItem[] }>(
    "/api/stats/me"
  );

// AI
export const getHint = (problemId: string, userCode?: string) =>
  apiPost<{ hint: string }>("/api/ai/hint", { problemId, userCode });

export const getExplanation = (problemId: string) =>
  apiPost<{ explanation: string; approach: string; keyInsights: string[] }>("/api/ai/explain", { problemId });

export const getCodeFeedback = (problemId: string, language: string, code: string) =>
  apiPost<PerformanceReview>("/api/ai/code-feedback", { problemId, language, code });

export const explainError = (
  problemId: string, language: string, code: string,
  errorDetails: { verdict: string; errorType: string; line: number | null; message: string },
  testcase?: { input?: string; expected?: string; received?: string | null },
) =>
  apiPost<ErrorExplanation>("/api/ai/explain-error", { problemId, language, code, errorDetails, testcase });

export const getAlternativeApproach = (problemId: string, language: string, code: string) =>
  apiPost<ImproveExplanation>("/api/ai/improve", { problemId, language, code });

export const chatWithAI = (problemId: string, messages: {role: string, content: string}[], code?: string, language?: string, signal?: AbortSignal) =>
  apiPost<{ reply: string }>("/api/ai/chat", { problemId, userCode: code, language, messages }, signal);
