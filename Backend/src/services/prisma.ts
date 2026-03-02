import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
}

/**
 * Auto-repair DATABASE_URL if password contains unencoded '@'.
 * e.g. '...Bisu@@aws...' → '...Bisu%40@aws...'
 * Native Prisma engine is sensitive to unencoded '@' characters.
 */
function fixDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  if (url.includes("%40") || !url.includes("@@")) return url;
  
  try {
    const firstAt = url.indexOf("@");
    const lastAt = url.lastIndexOf("@");
    
    if (firstAt !== -1 && lastAt !== -1 && firstAt !== lastAt) {
       const protocolAndUser = url.substring(0, url.indexOf(":", 11) + 1);
       const password = url.substring(protocolAndUser.length, lastAt);
       const hostAndRest = url.substring(lastAt);
       return `${protocolAndUser}${password.replace(/@/g, "%40")}${hostAndRest}`;
    }
    
    return url.replace("@@@", "%40%40@").replace("@@", "%40@");
  } catch {
    return url;
  }
}

/**
 * Appends native PgBouncer connection tuning parameters to the URL.
 * Required to prevent connection drops in long-running Node.js processes.
 */
function applyConnectionPoolTuning(url: string | undefined): string | undefined {
  if (!url) return url;
  let tunedUrl = url;
  if (!tunedUrl.includes("connection_limit=")) {
    tunedUrl += tunedUrl.includes("?") ? "&connection_limit=10" : "?connection_limit=10";
  }
  if (!tunedUrl.includes("pool_timeout=")) {
    tunedUrl += "&pool_timeout=15";
  }
  return tunedUrl;
}

let prismaInstance: PrismaClient | undefined;

function getPrisma(): PrismaClient {
  if (prismaInstance) return prismaInstance;

  const rawUrl = fixDatabaseUrl(process.env.DATABASE_URL);
  const tunedUrl = applyConnectionPoolTuning(rawUrl);

  if (tunedUrl) process.env.DATABASE_URL = tunedUrl;

  // Use the native Rust Query Engine. It handles PgBouncer pooling gracefully.
  prismaInstance = global._prisma ?? new PrismaClient({
    log: ["error", "warn"],
  });

  // Lazy One-time Connectivity Telemetry
  if (!global._prisma && process.env.NODE_ENV !== "test") {
    console.log("🐘 [Prisma] Lazy verifying native database connectivity via Supabase Pooler...");
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Database connection check timed out (8s)")), 8000)
    );

    Promise.race([prismaInstance.$queryRawUnsafe("SELECT 1"), timeoutPromise])
      .then(() => console.log("🐘 [Prisma] Native database connection verified successfully."))
      .catch((err: any) => {
        console.error("❌ [Prisma] Database connection check failed!");
        console.error("Reason:", err.message);
      });
  }

  if (process.env.NODE_ENV !== "production") {
    global._prisma = prismaInstance;
  }

  return prismaInstance;
}

const prisma = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    const instance = getPrisma();
    return (instance as any)[prop];
  }
});

export default prisma;
