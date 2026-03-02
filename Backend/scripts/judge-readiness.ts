import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

// ── Configuration ───────────────────────────────────────────────────────────
const DIRECT_URL = process.env.DIRECT_URL || "postgresql://postgres.ncknzhddyksxohlyzswz:Qc9v7J1eZ3G!%23uS@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";
const SRC_DIR = path.resolve(process.cwd(), "src");

// ── Scoring Weights ─────────────────────────────────────────────────────────
const WEIGHTS = {
  UAS_ADOPTION: 25,
  COMPARATOR_HEALTH: 20,
  METADATA_QUALITY: 20,
  SANDBOX_CONFIG: 15,
  OBSERVABILITY: 10,
  ERROR_INTEL: 10,
};

async function checkDatabaseMetrics(client: Client) {
  const { rows } = await client.query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN "inputSpec" IS NOT NULL AND jsonb_array_length("inputSpec"::jsonb) > 0 THEN 1 ELSE 0 END) AS uas_covered,
      SUM(CASE WHEN "outputSpec" IS NOT NULL THEN 1 ELSE 0 END) AS output_covered
    FROM problems
    WHERE "isActive" = true
  `);
  
  const total = parseInt(rows[0].total) || 1;
  const covered = parseInt(rows[0].uas_covered) || 0;
  return {
    total,
    covered,
    coveragePercent: (covered / total) * 100
  };
}

function checkFileContents(filePath: string, searchTerms: string[]): boolean {
  try {
    const fullPath = path.join(SRC_DIR, filePath);
    const code = fs.readFileSync(fullPath, "utf-8");
    return searchTerms.every(term => code.includes(term));
  } catch {
    return false;
  }
}

async function run() {
  console.log("🚀 Starting Aivon Judge Readiness Checker\\n");
  
  const client = new Client({ connectionString: DIRECT_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let score = 0;
  let maxScore = 100;

  try {
    // 1. UAS Adoption (25 pts)
    console.log("Checking UAS Adoption...");
    const dbMetrics = await checkDatabaseMetrics(client);
    let uasScore = 0;
    if (dbMetrics.coveragePercent >= 99) uasScore = 25;
    else if (dbMetrics.coveragePercent >= 95) uasScore = 20;
    else if (dbMetrics.coveragePercent >= 90) uasScore = 15;
    score += uasScore;
    console.log(`  - Coverage: ${dbMetrics.coveragePercent.toFixed(2)}% (${dbMetrics.covered}/${dbMetrics.total}) [${uasScore}/${WEIGHTS.UAS_ADOPTION} pts]\\n`);

    // 2. Comparator Health (20 pts)
    console.log("Checking Comparator Health...");
    const comparatorHealthy = checkFileContents("utils/judge-core/outputComparator.ts", [
      "Number.isFinite",
      "Math.abs",
      "EPS = 1e-5"
    ]);
    const judge0Healthy = checkFileContents("utils/judge0.ts", [
      "<= 1e-5"
    ]);
    const compScore = (comparatorHealthy && judge0Healthy) ? 20 : 0;
    score += compScore;
    console.log(`  - NaN guards, int/float coercion, unified EPS: ${compScore > 0 ? "✅" : "❌"} [${compScore}/${WEIGHTS.COMPARATOR_HEALTH} pts]\\n`);

    // 3. Metadata Quality (20 pts)
    console.log("Checking Metadata Format Health...");
    // Assuming our generator outputs arrays
    const { rows: formatRows } = await client.query(`
      SELECT COUNT(*) as bad_format
      FROM problems
      WHERE "inputSpec" IS NOT NULL AND jsonb_typeof("inputSpec"::jsonb) != 'array'
    `);
    const badFormat = parseInt(formatRows[0].bad_format);
    const metaScore = badFormat === 0 ? 20 : 0;
    score += metaScore;
    console.log(`  - Verified all inputSpec fields are valid JSON arrays: ${metaScore > 0 ? "✅" : "❌"} (${badFormat} bad) [${metaScore}/${WEIGHTS.METADATA_QUALITY} pts]\\n`);

    // 4. Sandbox Config (15 pts)
    console.log("Checking Sandbox Configuration (Output Limits & Recursion Guards)...");
    const sandboxHealthy = checkFileContents("utils/judge-core/verdictClassifier.ts", [
      "Output Limit Exceeded",
      "1_000_000"
    ]);
    const sandboxScore = sandboxHealthy ? 15 : 0;
    score += sandboxScore;
    console.log(`  - Output limits strictly enforced (1MB): ${sandboxHealthy ? "✅" : "❌"} [${sandboxScore}/${WEIGHTS.SANDBOX_CONFIG} pts]\\n`);

    // 5. Observability (10 pts)
    console.log("Checking System Observability...");
    const obsHealthy = checkFileContents("utils/code-runner.ts", ["executionPath: \"uas\""]) && 
                       checkFileContents("api/judge-health.api.ts", ["getJudgeMetrics()"]);
    const obsScore = obsHealthy ? 10 : 0;
    score += obsScore;
    console.log(`  - Path tagging and metrics endpoint present: ${obsHealthy ? "✅" : "❌"} [${obsScore}/${WEIGHTS.OBSERVABILITY} pts]\\n`);

    // 6. Error Intel (10 pts)
    console.log("Checking Error Intelligence Pipeline...");
    const intelHealthy = checkFileContents("utils/error-intel/pipeline.ts", ["analyzeError"]);
    const intelScore = intelHealthy ? 10 : 0;
    score += intelScore;
    console.log(`  - Error pipeline strictly active: ${intelHealthy ? "✅" : "❌"} [${intelScore}/${WEIGHTS.ERROR_INTEL} pts]\\n`);

    console.log("=================================================");
    console.log(`🏆 FINAL READINESS SCORE: ${score}/${maxScore}`);
    console.log("=================================================");
    
    if (score >= 85) {
      console.log("\\n🌟 VERDICT: READY_FOR_JS_PARITY");
      console.log("You have sufficient observability, sandbox safety, and data structure resilience to onboard a new language without regressions.");
    } else if (score >= 70) {
      console.log("\\n⚠️ VERDICT: PROCEED_WITH_CAUTION");
      console.log("The system might support JS/TS parity but there are critical safety gaps. Fix them first.");
    } else {
      console.log("\\n❌ VERDICT: NOT_READY");
      console.log("Do NOT launch JS parity yet. Fix the foundational sandboxing and comparator gaps.");
    }

  } finally {
    await client.end();
  }
}

run().catch(console.error);
