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
