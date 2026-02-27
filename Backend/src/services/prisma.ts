import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var _prisma: any;
}

/**
 * 🛠️ SURGICAL URL REPAIR
 * If the user's password contains an '@' (common in Supabase), it must be encoded as '%40'.
 * If the URL has '@@', it's definitely malformed.
 */
function fixDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  
  try {
    // If it already contains '@@', the user has likely put an unencoded '@' password
    if (url.includes("@@")) {
      console.warn("⚠️ DATABASE_URL detected with unencoded '@'. Attempting repair...");
      const parts = url.split(":");
      if (parts.length >= 3) {
        // Find the last ':' before the '@' of the host
        const lastPart = parts[2];
        const atIndex = lastPart.lastIndexOf("@");
        if (atIndex !== -1) {
          const password = lastPart.substring(0, atIndex);
          const rest = lastPart.substring(atIndex);
          // Only fix if there's a double @@ or obvious unencoded @
          if (rest.startsWith("@")) {
              const fixedPassword = password.replace(/@/g, "%40");
              const fixedUrl = `${parts[0]}:${parts[1]}:${fixedPassword}${rest}`;
              console.log("✅ DATABASE_URL repaired successfully.");
              return fixedUrl;
          }
        }
      }
    }
  } catch (e) {
    console.error("❌ Failed to auto-repair DATABASE_URL:", e);
  }
  return url;
}

const rawUrl = process.env.DATABASE_URL;
const finalUrl = fixDatabaseUrl(rawUrl);

// Sanitized URL Logging (hides password)
try {
    if (finalUrl) {
        const scrubbed = finalUrl.replace(/:([^:@]+)@/, ":****@");
        console.log(`📡 [Prisma Check] Target: ${scrubbed}`);
    } else {
        console.error("🔴 [Prisma Check] DATABASE_URL is EMPTY!");
    }
} catch (e) {
    console.warn("⚠️ Could not log sanitized URL");
}

const pool = new Pool({ 
  connectionString: finalUrl,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, 
});

// Immediately test the pool
pool.connect().then(client => {
    console.log("✅ [Prisma Check] Pool connected successfully to Supabase.");
    client.release();
}).catch(err => {
    console.error("❌ [Prisma Check] Pool failed to connect:", err.message);
});

pool.on('error', (err) => {
  console.error('🔥 [Prisma Check] Unexpected error on idle client:', err.message);
});

const adapter = new PrismaPg(pool);

const prisma = global._prisma ?? new PrismaClient({
  adapter,
  log: ["error", "warn"],
});


if (process.env.NODE_ENV !== "production") {
  global._prisma = prisma;
}

export default prisma;

