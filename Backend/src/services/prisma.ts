import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Synchronously load the Prisma Client from the generated path
// to bypass the Top-level await issue in CJS environments.
const clientPath = path.join(process.cwd(), "generated", "prisma", "index.js");
const { PrismaClient } = require(clientPath);

declare global {
  // eslint-disable-next-line no-var
  var _prisma: any;
}

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });

const prisma = global._prisma ?? new PrismaClient({ adapter });

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
