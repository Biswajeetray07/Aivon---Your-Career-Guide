import type { ApiMiddleware } from "motia";
import fs from "fs";
import path from "path";
import os from "os";

// Store rate limit data in a temporary file to share state across Motia worker threads
const rateLimitFile = path.join(os.tmpdir(), "aivon-rate-limit.json");

function getRateLimitStore(): Record<string, { count: number; resetTime: number }> {
  try {
    if (fs.existsSync(rateLimitFile)) {
      const data = fs.readFileSync(rateLimitFile, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    // Ignore read errors
  }
  return {};
}

function saveRateLimitStore(store: Record<string, { count: number; resetTime: number }>) {
  try {
    fs.writeFileSync(rateLimitFile, JSON.stringify(store), "utf-8");
  } catch (e) {
    // Ignore write errors
  }
}

/**
 * Creates a rate limiting middleware
 * @param windowMs Time window in milliseconds (e.g., 60000 for 1 minute)
 * @param max Requests allowed per window
 * @param identifier "IP" or "USER_ID" to determine what to bucket requests by
 */
export const rateLimitMiddleware = (
  windowMs: number,
  max: number,
  identifier: "IP" | "USER_ID" = "IP"
): ApiMiddleware<any, any, any> => async (req, _ctx, next) => {
  const now = Date.now();
  
  // Try to get identifier from headers (e.g., set by authMiddleware or x-forwarded-for)
  let key = "global";
  if (identifier === "USER_ID") {
    key = (req.headers as any)["x-user-id"] || "anonymous";
  } else {
    // Basic IP extraction. Note: In Motia, req might be a standard Request object.
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      key = forwarded.split(",")[0].trim();
    } else if (Array.isArray(forwarded) && forwarded.length > 0) {
      key = forwarded[0].trim();
    } else {
      key = "unknown_ip";
    }
  }

  const store = getRateLimitStore();
  const record = store[key];

  console.log(`[RateLimit Debug] Key: ${key}, Count: ${record ? record.count : 0}, Max: ${max}`);

  if (!record || now > record.resetTime) {
    // First request or window expired
    store[key] = { count: 1, resetTime: now + windowMs };
    saveRateLimitStore(store);
    return next();
  }

  if (record.count >= max) {
    return {
      status: 429,
      body: { 
        error: "Too Many Requests", 
        message: `Rate limit exceeded. Try again in Math.ceil((record.resetTime - now) / 1000) seconds.` 
      }
    };
  }

  store[key].count += 1;
  saveRateLimitStore(store);
  return next();
};
