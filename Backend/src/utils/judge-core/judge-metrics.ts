/**
 * Lightweight, in-memory Judge Telemetry & Metrics Tracker
 * Enables real-time observability of verdict distribution, execution paths, and anomalies.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface JudgeMetricsSnapshot {
  uptimeSeconds: number;
  totalExecutions: number;
  byExecutionPath: {
    uas: number;
    legacy: number;
  };
  byVerdict: Record<string, number>;
  byLanguage: Record<string, number>;
  runtimeHistograms: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  };
  anomalies: {
    slowExecutions: number;
    outputLimitExceeded: number;
    internalErrors: number;
  };
}

// ── In-Memory State ─────────────────────────────────────────────────────────

const START_TIME = Date.now();
const STATE = {
  totalExecutions: 0,
  path: { uas: 0, legacy: 0 },
  verdicts: {} as Record<string, number>,
  languages: {} as Record<string, number>,
  runtimes: [] as number[], // Keep last 1000 for histograms
  anomalies: { slow: 0, ole: 0, ie: 0 }
};

const MAX_RUNTIMES = 2000;
const SLOW_THRESHOLD_MS = 2000;

// ── API ─────────────────────────────────────────────────────────────────────

export function recordJudgeMetrics(
  verdict: string,
  runtimeMs: number,
  executionPath: "uas" | "legacy",
  language: string
) {
  STATE.totalExecutions++;
  STATE.path[executionPath] = (STATE.path[executionPath] || 0) + 1;
  
  STATE.verdicts[verdict] = (STATE.verdicts[verdict] || 0) + 1;
  STATE.languages[language] = (STATE.languages[language] || 0) + 1;

  if (runtimeMs > 0) {
    STATE.runtimes.push(runtimeMs);
    if (STATE.runtimes.length > MAX_RUNTIMES) STATE.runtimes.shift();
  }

  // Record Anomalies
  if (runtimeMs > SLOW_THRESHOLD_MS) STATE.anomalies.slow++;
  if (verdict === "Output Limit Exceeded" || verdict === "OUTPUT_LIMIT_EXCEEDED") STATE.anomalies.ole++;
  if (verdict === "Internal Error" || verdict === "INTERNAL_ERROR") STATE.anomalies.ie++;
}

export function getJudgeMetrics(): JudgeMetricsSnapshot {
  const sortedRuntimes = [...STATE.runtimes].sort((a, b) => a - b);
  const count = sortedRuntimes.length;
  
  let p50 = 0, p95 = 0, p99 = 0, avg = 0;
  
  if (count > 0) {
    p50 = sortedRuntimes[Math.floor(count * 0.5)];
    p95 = sortedRuntimes[Math.floor(count * 0.95)];
    p99 = sortedRuntimes[Math.floor(count * 0.99)];
    avg = Math.round(sortedRuntimes.reduce((a, b) => a + b, 0) / count);
  }

  return {
    uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
    totalExecutions: STATE.totalExecutions,
    byExecutionPath: { ...STATE.path },
    byVerdict: { ...STATE.verdicts },
    byLanguage: { ...STATE.languages },
    runtimeHistograms: { p50, p95, p99, avg },
    anomalies: {
      slowExecutions: STATE.anomalies.slow,
      outputLimitExceeded: STATE.anomalies.ole,
      internalErrors: STATE.anomalies.ie
    }
  };
}
