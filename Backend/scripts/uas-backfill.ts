#!/usr/bin/env npx tsx
/**
 * UAS Metadata Backfill CLI
 *
 * Scans all problems missing inputSpec and generates proposals using
 * the heuristic engine (starter code parsing + title/desc analysis).
 *
 * Usage:
 *   npx tsx scripts/uas-backfill.ts                    # dry-run (default)
 *   npx tsx scripts/uas-backfill.ts --apply             # apply auto tier (≥0.90)
 *   npx tsx scripts/uas-backfill.ts --apply-all          # apply auto+review (≥0.75)
 *   npx tsx scripts/uas-backfill.ts --report report.json  # save JSON report
 */

import "dotenv/config";
import pg from "pg";
import { generateProposal } from "../src/utils/uas/generator.js";
import type { MetadataProposal, ConfidenceTier } from "../src/utils/uas/generator.js";
import fs from "fs";

const { Pool } = pg;

// ── CLI Args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const MODE = args.includes("--apply-all") ? "apply-all"
           : args.includes("--apply") ? "apply"
           : "dry-run";
const reportIdx = args.indexOf("--report");
const REPORT_PATH = reportIdx >= 0 ? args[reportIdx + 1] : null;

console.log(`\n🔧 UAS Metadata Backfill — Mode: ${MODE.toUpperCase()}\n`);

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 1. Fetch all problems missing inputSpec
    const { rows } = await pool.query(`
      SELECT id, slug, title, "starterCode", description, "entryPoint", "problemType"
      FROM problems
      WHERE "inputSpec" IS NULL
      ORDER BY slug
    `);
    console.log(`📊 Found ${rows.length} problems without inputSpec\n`);

    // 2. Generate proposals
    const proposals: MetadataProposal[] = [];
    for (const row of rows) {
      const proposal = generateProposal(row);
      proposals.push(proposal);
    }

    // 3. Tally results
    const tally: Record<ConfidenceTier, number> = { auto: 0, review: 0, ambiguous: 0, reject: 0 };
    for (const p of proposals) tally[p.tier]++;

    console.log("═══════════════════════════════════════════════════");
    console.log(`📊 RESULTS SUMMARY`);
    console.log("═══════════════════════════════════════════════════");
    console.log(`  ✅ Auto (≥0.90):      ${tally.auto}`);
    console.log(`  🔍 Review (0.75-0.89): ${tally.review}`);
    console.log(`  ⚠️  Ambiguous (0.50-0.74): ${tally.ambiguous}`);
    console.log(`  ❌ Reject (<0.50):     ${tally.reject}`);
    console.log(`  ─────────────────────`);
    console.log(`  Total:                ${proposals.length}\n`);

    // 4. Show some examples from each tier
    for (const tier of ["auto", "review", "ambiguous", "reject"] as ConfidenceTier[]) {
      const samples = proposals.filter(p => p.tier === tier).slice(0, 5);
      if (samples.length === 0) continue;
      const icon = tier === "auto" ? "✅" : tier === "review" ? "🔍" : tier === "ambiguous" ? "⚠️" : "❌";
      console.log(`${icon} ${tier.toUpperCase()} tier (showing ${samples.length}):`);
      for (const p of samples) {
        const types = p.proposedInputSpec.map(f => `${f.name}:${f.type}`).join(", ");
        const sig = p.signals.map(s => `${s.source}=${s.score.toFixed(2)}`).join(" ");
        console.log(`  ${p.slug} → [${types}] → ${p.proposedOutputSpec.type} (conf=${p.confidence.toFixed(2)}) ${sig}`);
        if (p.isAmbiguous) console.log(`    ⚠️  ${p.ambiguityReason}`);
      }
      console.log();
    }

    // 5. Write report if requested
    if (REPORT_PATH) {
      fs.writeFileSync(REPORT_PATH, JSON.stringify(proposals, null, 2));
      console.log(`📄 Report saved to: ${REPORT_PATH}\n`);
    }

    // 6. Apply if not dry-run
    if (MODE === "dry-run") {
      console.log("ℹ️  DRY RUN — no changes made. Use --apply to write auto-tier proposals.\n");
      return;
    }

    const eligibleTiers: ConfidenceTier[] = MODE === "apply-all"
      ? ["auto", "review"]
      : ["auto"];

    const toApply = proposals.filter(p => eligibleTiers.includes(p.tier) && !p.isAmbiguous);
    console.log(`📝 Applying ${toApply.length} proposals...\n`);

    let applied = 0;
    let errors = 0;

    for (const p of toApply) {
      try {
        await pool.query(
          `UPDATE problems SET "inputSpec" = $1, "outputSpec" = $2 WHERE id = $3`,
          [JSON.stringify(p.proposedInputSpec), JSON.stringify(p.proposedOutputSpec), p.problemId]
        );
        applied++;
        if (applied % 100 === 0) {
          console.log(`  ...applied ${applied}/${toApply.length}`);
        }
      } catch (err: any) {
        errors++;
        console.error(`  ❌ Failed: ${p.slug} — ${err.message}`);
      }
    }

    console.log(`\n✅ Applied: ${applied}`);
    if (errors > 0) console.log(`❌ Errors: ${errors}`);
    console.log();

  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
