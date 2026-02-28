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
 * e.g. '...Bisu@@aws...' → '...Bisu%40@aws...'
 */
function fixDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  // If it's already encoded or doesn't have the problematic double @ patterns, return as is
  if (url.includes("%40") || !url.includes("@@")) return url;
  
  try {
    // Specifically target the password section: postgresql://user:pass@@host...
    // We want to encode the @ that are part of the password.
    // A simple approach: everything between the second ':' and the LAST '@' is the password.
    const firstAt = url.indexOf("@");
    const lastAt = url.lastIndexOf("@");
    
    if (firstAt !== -1 && lastAt !== -1 && firstAt !== lastAt) {
       // There are multiple @, the last one is likely the host separator
       const protocolAndUser = url.substring(0, url.indexOf(":", 11) + 1); // 11 is after postgresql:
       const password = url.substring(protocolAndUser.length, lastAt);
       const hostAndRest = url.substring(lastAt);
       return `${protocolAndUser}${password.replace(/@/g, "%40")}${hostAndRest}`;
    }
    
    // Fallback simple replace for common mistake
    return url.replace("@@@", "%40%40@").replace("@@", "%40@");
  } catch {
    return url;
  }
}

let prismaInstance: PrismaClient | undefined;

function getPrisma(): PrismaClient {
  if (prismaInstance) return prismaInstance;

  const finalUrl = fixDatabaseUrl(process.env.DATABASE_URL);

  if (!global._pool) {
    global._pool = new Pool({
      connectionString: finalUrl,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    global._pool.on("error", (err) => {
      console.error("🔥 Unexpected error on idle client:", err.message);
    });

    // Lazy One-time Connectivity Telemetry
    if (process.env.NODE_ENV !== "test") {
      console.log("🐘 [Prisma] Lazy verifying database connectivity...");
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Database connection check timed out (5s)")), 5000)
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
