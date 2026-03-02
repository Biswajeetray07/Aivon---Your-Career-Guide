import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
  var _pool: Pool | undefined;
}

/**
 * Auto-repair DATABASE_URL if password contains unencoded '@'.
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
 * Appends pg native keepalive parameters to URL to prevent Supabase connection drops.
 */
function applyConnectionPoolTuning(url: string | undefined): string | undefined {
  if (!url) return url;
  let tunedUrl = url;
  if (!tunedUrl.includes("keepalives_idle=")) {
    tunedUrl += tunedUrl.includes("?") ? "&keepalives_idle=0" : "?keepalives_idle=0";
  }
  return tunedUrl;
}

let prismaInstance: PrismaClient | undefined;

function getPrisma(): PrismaClient {
  if (prismaInstance) return prismaInstance;

  const rawUrl = fixDatabaseUrl(process.env.DATABASE_URL);
  const tunedUrl = applyConnectionPoolTuning(rawUrl);

  if (!global._pool) {
    // We MUST use the adapter-pg for Motia edge-bundler compatibility.
    // To prevent the "Connection terminated due to connection timeout" error
    // with Supabase PgBouncer, we configure highly resilient pool settings.
    global._pool = new Pool({
      connectionString: tunedUrl,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 15, // Handle burst traffic
      idleTimeoutMillis: 15000, // Close idle connections BEFORE Supabase does (~2 mins)
      connectionTimeoutMillis: 20000, // Give more time for AWS ap-south-1 TLS handshakes
      allowExitOnIdle: true, // Don't hang the Node event loop
    });

    global._pool.on("error", (err) => {
      // Don't crash the server on idle client drops, just log
      console.error("🔥 [Prisma Pool] Unexpected error on idle client:", err.message);
    });

    // Lazy One-time Connectivity Telemetry
    if (process.env.NODE_ENV !== "test") {
      console.log("🐘 [Prisma] Lazy verifying PgBouncer database connectivity via Edge Adapter...");
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Database connection check timed out (8s)")), 8000)
      );

      Promise.race([global._pool.query("SELECT 1"), timeoutPromise])
        .then(() => console.log("🐘 [Prisma] Database connection verified successfully."))
        .catch((err: any) => {
          console.error("❌ [Prisma] Database connection check failed!");
          console.error("Reason:", err.message);
        });
    }
  }

  const pool = global._pool;
  const adapter = new PrismaPg(pool);

  prismaInstance = global._prisma ?? new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });

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
