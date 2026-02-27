// Use relative path by default to route through Next.js proxy (which handles CORS)
const API = process.env.NEXT_PUBLIC_BACKEND_URL || "";
import type { ErrorExplanation, PerformanceReview, ImproveExplanation } from "@/components/ai/AiFloatingPanel";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("aivon_token");
}

function buildHeaders(extra: Record<string, string> = {}) {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    "x-backend": "true",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function safeJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.slice(0, 200) || `HTTP ${res.status}`);
  }
}

// ─── Shared Base Fetch ────────────────────────────────────────────────────────
async function apiFetch<T>(
  method: "GET" | "POST" | "DELETE" | "PATCH",
  path: string,
  body?: unknown,
  signal?: AbortSignal,
  timeoutMs: number = 60000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error(`Request timeout (${timeoutMs / 1000}s)`)), timeoutMs);

  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }

  let res: Response;
  try {
    const fullUrl = API ? `${API}${path}` : path;
    res = await fetch(fullUrl, {
      method,
      headers: buildHeaders(),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err: any) {
    const errorMsg = err?.message?.toLowerCase() || "";
    if (err?.name === "AbortError" || signal?.aborted) {
      const abortErr = new Error(err?.message || "Request timed out");
      abortErr.name = "AbortError";
      throw abortErr;
    }
    
    // Provide a more helpful message for common fetch failures
    let finalMsg = err?.message || "Network Error";
    if (errorMsg.includes("load failed") || errorMsg.includes("failed to fetch")) {
      finalMsg = "Connection failed. Please ensure the backend is running and reachable.";
    }
    throw new Error(finalMsg);
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await safeJson(res);
  if (!res.ok) {
    const errData = data as any;
    const error = new Error(errData?.error || errData?.message || Array.isArray(errData) ? "Validation Error" : `HTTP ${res.status}`);
    (error as any).data = errData;
    (error as any).status = res.status;
    throw error;
  }
  return data as T;
}

// ─── Public API Methods ───────────────────────────────────────────────────────
export const apiPost = <T>(path: string, body: unknown, signal?: AbortSignal, timeoutMs?: number) =>
  apiFetch<T>("POST", path, body, signal, timeoutMs);

export const apiGet = <T>(path: string) =>
  apiFetch<T>("GET", path);

export const apiDelete = <T>(path: string) =>
  apiFetch<T>("DELETE", path);

export const apiPatch = <T>(path: string, body: unknown) =>
  apiFetch<T>("PATCH", path, body);

// ─── Auth ─────────────────────────────────────────────────────────────────────
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
    "/api/auth/me"
  );

// ─── Problems ─────────────────────────────────────────────────────────────────
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

// ─── Submissions ──────────────────────────────────────────────────────────────
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
  apiPost<RunResult>("/api/run", { problemId, language, code }, undefined, 60000);

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

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export const getLeaderboard = () =>
  apiGet<{ leaderboard: Array<{ rank: number; userId: string; name: string | null; email: string; rating: number; solved: number }> }>(
    "/api/leaderboard"
  );

// ─── Stats ────────────────────────────────────────────────────────────────────
export const getMyStats = () =>
  apiGet<{ totalSolved: number; totalSubmissions: number; accuracy: number; streak: number; rating: number; byDifficulty: { EASY: number; MEDIUM: number; HARD: number }; recentActivity: SubmissionHistoryItem[] }>(
    "/api/stats/me"
  );

// ─── Rating ───────────────────────────────────────────────────────────────────
export const getUserRating = () =>
  apiGet<{ rating: number; rank: number; percentile: number; totalUsers: number }>("/api/user/rating");

// ─── AI ───────────────────────────────────────────────────────────────────────
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

export const chatWithAI = (problemId: string, messages: {role: string, content: string}[], code?: string, language?: string, signal?: AbortSignal, threadId?: string, editorContext?: { lastRun?: { status: string; stderr?: string; stdout?: string; failingTest?: string } }) =>
  apiPost<{ reply: string; threadId: string }>("/api/ai/chat", { problemId, userCode: code, language, messages, threadId, editorContext }, signal, 120000);

// ─── Chat History ─────────────────────────────────────────────────────────────
export const listChatThreads = (problemId?: string) => {
  const qs = new URLSearchParams();
  if (problemId) qs.set("problemId", problemId);
  return apiGet<{ threads: Array<{ id: string; title: string | null; createdAt: string; updatedAt: string }> }>(`/api/chat/threads?${qs}`);
};

export const getChatThread = (id: string) =>
  apiGet<{ thread: { id: string; title: string | null; createdAt: string; messages: Array<{ role: string; content: string; createdAt: string }> } }>(`/api/chat/threads/${id}`);

export const deleteChatThread = (id: string) => 
  apiDelete<{ success: boolean }>(`/api/chat/threads/${id}`);

export const clearChatThreads = () => 
  apiDelete<{ success: boolean; count: number }>("/api/chat/threads");

export const updateThreadTitle = (id: string, title: string) =>
  apiPatch<{ success: boolean }>(`/api/chat/threads/${id}`, { title });
