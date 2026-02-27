import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var _prisma: any;
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20, 
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

const adapter = new PrismaPg(pool);

// Standard Prisma instantiation for Node.js environments
const prisma = global._prisma ?? new PrismaClient({
  adapter,
  log: ["error", "warn"],
});

if (process.env.NODE_ENV !== "production") {
  global._prisma = prisma;
}

export default prisma;

// Process crash guards (H7 - Don't swallow errors)
if (typeof process !== "undefined") {
  process.on("uncaughtException", (err) => {
    console.error("💥 FATAL UNCAUGHT EXCEPTION:", err);
    if (process.env.NODE_ENV === "production") process.exit(1);
  });
  
  process.on("unhandledRejection", (err) => {
    console.error("💥 UNHANDLED REJECTION:", err);
    if (process.env.NODE_ENV === "production") process.exit(1);
  });
}

// Prisma Health Check removed to prevent worker console spam
