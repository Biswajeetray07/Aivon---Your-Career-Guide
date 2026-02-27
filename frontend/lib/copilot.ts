/**
 * Copilot utility for the problem editor.
 * Manages AbortController lifecycle, request debouncing, and client-side caching.
 */

const DEBOUNCE_MS = 600;
const MAX_CACHE_SIZE = 20;

interface CacheEntry {
  key: string;
  response: string;
  timestamp: number;
}

export class CopilotManager {
  private abortController: AbortController | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private cache: CacheEntry[] = [];
  private requestCount = 0;
  private lastRequestTime = 0;

  /**
   * Generate a cache key from problem + code hash.
   */
  private getCacheKey(problemId: string, codeHash: string, prompt: string): string {
    return `${problemId}:${codeHash}:${prompt.slice(0, 50)}`;
  }

  /**
   * Check cache for a matching response.
   */
  getCachedResponse(problemId: string, codeHash: string, prompt: string): string | null {
    const key = this.getCacheKey(problemId, codeHash, prompt);
    const entry = this.cache.find(e => e.key === key);
    if (entry && Date.now() - entry.timestamp < 5 * 60 * 1000) { // 5 min TTL
      return entry.response;
    }
    return null;
  }

  /**
   * Store a response in cache.
   */
  cacheResponse(problemId: string, codeHash: string, prompt: string, response: string): void {
    const key = this.getCacheKey(problemId, codeHash, prompt);
    // Remove old entry if exists
    this.cache = this.cache.filter(e => e.key !== key);
    this.cache.push({ key, response, timestamp: Date.now() });
    // Evict oldest if cache is full
    if (this.cache.length > MAX_CACHE_SIZE) {
      this.cache.shift();
    }
  }

  /**
   * Cancel any in-flight request.
   */
  cancelPending(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Get a fresh AbortController, canceling any previous one.
   */
  getSignal(): AbortSignal {
    this.cancelPending();
    this.abortController = new AbortController();
    return this.abortController.signal;
  }

  /**
   * Rate limiting check: max 10 requests per minute.
   */
  canRequest(): boolean {
    const now = Date.now();
    if (now - this.lastRequestTime < 60000 / 10) {
      return false; // Too fast
    }
    return true;
  }

  /**
   * Mark a request as sent.
   */
  markRequest(): void {
    this.requestCount++;
    this.lastRequestTime = Date.now();
  }

  /**
   * Debounced execution: delays execution by DEBOUNCE_MS.
   * Cancels any previous pending debounce.
   */
  debounce(fn: () => void): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      fn();
    }, DEBOUNCE_MS);
  }

  /**
   * Generate a simple hash of code for caching.
   */
  static hashCode(code: string): string {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
}

// Singleton instance
export const copilot = new CopilotManager();
