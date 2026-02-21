/**
 * Seed normalized problems into Supabase PostgreSQL via Prisma
 * Usage: npx ts-node --esm data/scripts/seed.ts
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const BATCH_SIZE = 10;

async function seed() {
  const filePath = path.join(ROOT, "data/processed/normalized_problems.json");
  if (!fs.existsSync(filePath)) {
    console.error("❌ Run parse.ts first: npx ts-node --esm data/scripts/parse.ts");
    process.exit(1);
  }

  const problems = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`🌱 Seeding ${problems.length} problems in batches of ${BATCH_SIZE}...`);

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < problems.length; i += BATCH_SIZE) {
    const batch = problems.slice(i, i + BATCH_SIZE);

    for (const p of batch) {
      try {
        const existing = await prisma.problem.findUnique({ where: { slug: p.slug } });
        if (existing) { skipped++; continue; }

        await prisma.problem.create({
          data: {
            title: p.title,
            slug: p.slug,
            difficulty: p.difficulty,
            description: p.description,
            constraints: p.constraints || null,
            starterCode: p.starterCode,
            entryPoint: p.entryPoint,
            tags: p.tags,
            examples: [],
            aiContext: p.aiContext,
            testCases: { createMany: { data: p.testCases } },
          },
        });
        inserted++;
      } catch (err: any) {
        console.warn(`⚠️  Skipping "${p.slug}": ${err.message?.slice(0, 80)}`);
        skipped++;
      }
    }

    if (i % (BATCH_SIZE * 5) === 0 || i + BATCH_SIZE >= problems.length) {
      const processed = Math.min(i + BATCH_SIZE, problems.length);
      console.log(`  Progress: ${processed}/${problems.length} (${Math.round(processed/problems.length*100)}%) | ✅ ${inserted} ins | ⏭️  ${skipped} skip`);
    }
  }

  console.log(`\n🎉 Seeding complete!`);
  console.log(`   ✅ Inserted: ${inserted}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  prisma.$disconnect();
  process.exit(1);
});
