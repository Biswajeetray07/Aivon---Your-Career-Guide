import { Client } from "pg";

const DIRECT_URL = process.env.DIRECT_URL || "postgresql://postgres.ncknzhddyksxohlyzswz:Qc9v7J1eZ3G!%23uS@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

async function run() {
  console.log("📊 Aivon Problem Metadata Audit\\n");
  const client = new Client({ connectionString: DIRECT_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    // 1. Total Coverage
    const { rows: coverage } = await client.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN "inputSpec" IS NOT NULL THEN 1 ELSE 0 END) AS input_covered,
        SUM(CASE WHEN "outputSpec" IS NOT NULL THEN 1 ELSE 0 END) AS output_covered
      FROM problems
    `);
    
    const total = parseInt(coverage[0].total) || 1;
    const coveredInputs = parseInt(coverage[0].input_covered);
    
    console.log("--- 📈 COVERAGE SUMMARY ---");
    console.log(`Total Problems: ${total}`);
    console.log(`UAS Coverage (Input): ${coveredInputs} (${((coveredInputs / total) * 100).toFixed(2)}%)`);
    console.log(`UAS Coverage (Output): ${coverage[0].output_covered} (${((coverage[0].output_covered / total) * 100).toFixed(2)}%)\\n`);

    // 2. Missing Specs details
    const { rows: missing } = await client.query(`
      SELECT slug, title
      FROM problems
      WHERE "inputSpec" IS NULL OR jsonb_array_length("inputSpec"::jsonb) = 0
    `);
    
    if (missing.length > 0) {
      console.log(`--- ⚠️ MISSING METADATA (${missing.length}) ---`);
      missing.slice(0, 10).forEach((p: any) => console.log(` - ${p.slug} (${p.title})`));
      if (missing.length > 10) console.log(`   ...and ${missing.length - 10} more\\n`);
    }

    // 3. Type Distribution
    // To analyze specific types, we query all inputSpecs and collect statistics
    const { rows: specs } = await client.query(`
      SELECT "inputSpec" FROM problems WHERE "inputSpec" IS NOT NULL
    `);
    
    const typeFreq: Record<string, number> = {};
    specs.forEach((row: any) => {
      try {
        const arr = typeof row.inputSpec === "string" ? JSON.parse(row.inputSpec) : row.inputSpec;
        if (Array.isArray(arr)) {
          arr.forEach((field: any) => {
            const t = field.type || "unknown";
            typeFreq[t] = (typeFreq[t] || 0) + 1;
          });
        }
      } catch (e) { /* ignore */ }
    });

    console.log("--- 🧩 TYPE DISTRIBUTION (Parameters) ---");
    const sortedTypes = Object.entries(typeFreq).sort((a, b) => b[1] - a[1]);
    sortedTypes.forEach(([type, count]) => {
      console.log(` - ${type.padEnd(25)} : ${count}`);
    });
    console.log("");
    
  } finally {
    await client.end();
  }
}

run().catch(console.error);
