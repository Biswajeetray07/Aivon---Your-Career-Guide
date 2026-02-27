import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var _prisma: any;
}

/**
 * Auto-repair DATABASE_URL if password contains unencoded '@'.
 * e.g. '...Bisu@@aws...' → '...Bisu%40@aws...'
 */
function fixDatabaseUrl(url: string | undefined): string | undefined {
  if (!url || !url.includes("@@")) return url;
  try {
    const parts = url.split(":");
    if (parts.length >= 3) {
      const lastPart = parts[2];
      const atIndex = lastPart.lastIndexOf("@");
      if (atIndex !== -1) {
        const password = lastPart.substring(0, atIndex);
        const rest = lastPart.substring(atIndex);
        if (rest.startsWith("@")) {
          const fixedPassword = password.replace(/@/g, "%40");
          return `${parts[0]}:${parts[1]}:${fixedPassword}${rest}`;
        }
      }
    }
  } catch {}
  return url;
}

const finalUrl = fixDatabaseUrl(process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: finalUrl,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("🔥 Unexpected error on idle client:", err.message);
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
