import "dotenv/config";
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var _prisma: any;
}

// Standard Prisma instantiation for Node.js environments
const prisma = global._prisma ?? new PrismaClient({
  log: ["error", "warn"],
});

if (process.env.NODE_ENV !== "production") {
  global._prisma = prisma;
}

// Proactive connection test on startup (for logging)
// We use a timeout to ensure we don't hang the worker indefinitely
if (process.env.NODE_ENV === "production") {
  console.log("🚀 Starting DB connection test...");
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("DB Connection Timeout (30s)")), 30000));
  
  Promise.race([prisma.$connect(), timeout])
    .then(() => console.log("✅ Database linked successfully"))
    .catch((err) => {
        console.error("❌ Database link failed:", err.message);
        // Don't exit yet, let the handler report the error
    });
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
