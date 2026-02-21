import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "path";
import { pathToFileURL } from "url";

// Dynamically import the ESM entry point (client.ts) at runtime,
// bypassing Motia's compiler which can't handle Prisma's internal dependency tree.
// Node.js natively resolves .ts files in the generated directory.
const clientUrl = pathToFileURL(path.join(process.cwd(), "generated", "prisma", "client.ts")).href;
const { PrismaClient } = await import(clientUrl);

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
