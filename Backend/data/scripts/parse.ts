/**
 * Parse raw LeetCode dataset JSON → normalized problems JSON
 * Captures ALL dataset fields including aiContext (completion, prompt, query, response)
 * Usage: npx ts-node --esm data/scripts/parse.ts
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

interface RawItem {
  task_id: string;
  question_id: number;
  difficulty: string;
  tags: string[];
  problem_description: string;
  constraints?: string;
  starter_code: string;
  entry_point: string;
  input_output: Array<{ input: unknown; output: unknown }>;
  test?: string;
  prompt?: string;
  completion?: string;
  query?: string;
  response?: string;
  estimated_date?: string;
}

interface NormalizedProblem {
  title: string;
  slug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  description: string;
  constraints: string;
  starterCode: Record<string, string>;
  entryPoint: string;
  tags: string[];
  // Private AI context — never sent to frontend
  aiContext: {
    completion: string;
    prompt: string;
    query: string;
    response: string;
    test: string;
    estimatedDate: string;
  };
  testCases: Array<{ input: string; expected: string; isHidden: boolean; order: number }>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function mapDifficulty(d: string): "EASY" | "MEDIUM" | "HARD" {
  const u = d.toUpperCase();
  if (u === "EASY") return "EASY";
  if (u === "MEDIUM") return "MEDIUM";
  return "HARD";
}

function safeStringify(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  return JSON.stringify(val);
}

const rawPath = path.join(ROOT, "data/raw/leetcode_dataset.json");
if (!fs.existsSync(rawPath)) {
  console.error("❌ Raw dataset not found. Run: python3 data/scripts/download.py first");
  process.exit(1);
}

const raw: RawItem[] = JSON.parse(fs.readFileSync(rawPath, "utf-8"));
console.log(`📊 Processing ${raw.length} problems from HuggingFace dataset...`);

const slugCounts: Record<string, number> = {};
const normalized: NormalizedProblem[] = [];
let skippedNoTests = 0;
let skippedNoEntry = 0;

for (const item of raw) {
  if (!item.problem_description) continue;
  if (!item.entry_point) { skippedNoEntry++; continue; }

  // Build unique slug
  const baseName = item.task_id.replace(/LeetCode\//, "").replace(/_/g, "-");
  const baseSlug = slugify(baseName);
  slugCounts[baseSlug] = (slugCounts[baseSlug] ?? 0) + 1;
  const slug = slugCounts[baseSlug] > 1 ? `${baseSlug}-v${slugCounts[baseSlug]}` : baseSlug;

  // Parse test cases from input_output array
  const testCases: NormalizedProblem["testCases"] = [];
  for (let i = 0; i < (item.input_output ?? []).length; i++) {
    const tc = item.input_output[i];
    const inputStr = safeStringify(tc.input);
    const expectedStr = safeStringify(tc.output);
    if (!inputStr || !expectedStr) continue;
    testCases.push({
      input: inputStr,
      expected: expectedStr,
      isHidden: i >= 3, // First 3 visible, rest hidden
      order: i,
    });
    if (testCases.length >= 20) break; // cap at 20 per problem
  }

  if (testCases.length === 0) {
    skippedNoTests++;
    continue;
  }

  normalized.push({
    title: baseName.replace(/-/g, " "),
    slug,
    difficulty: mapDifficulty(item.difficulty ?? "MEDIUM"),
    description: (item.problem_description ?? "").slice(0, 8000),
    constraints: item.constraints ?? "",
    starterCode: {
      python: item.starter_code ?? `def ${item.entry_point}():\n    pass`,
      javascript: `/**\n * @return {any}\n */\nvar ${item.entry_point} = function() {\n    \n};`,
      java: `class Solution {\n    public Object ${item.entry_point}() {\n        \n    }\n}`,
      cpp: `class Solution {\npublic:\n    auto ${item.entry_point}() {\n        \n    }\n};`,
    },
    entryPoint: item.entry_point,
    tags: item.tags ?? [],
    aiContext: {
      completion: (item.completion ?? "").slice(0, 5000),
      prompt: item.prompt ?? "",
      query: (item.query ?? "").slice(0, 2000),
      response: (item.response ?? "").slice(0, 3000),
      test: (item.test ?? "").slice(0, 3000),
      estimatedDate: item.estimated_date ?? "",
    },
    testCases,
  });
}

const outDir = path.join(ROOT, "data/processed");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "normalized_problems.json");
fs.writeFileSync(outPath, JSON.stringify(normalized, null, 2));

console.log(`\n✅ Parse complete!`);
console.log(`   ✅ Normalized: ${normalized.length} problems`);
console.log(`   ⏭️  Skipped (no test cases): ${skippedNoTests}`);
console.log(`   ⏭️  Skipped (no entry point): ${skippedNoEntry}`);
console.log(`   📁 Output: ${outPath}`);
console.log(`   💾 Size: ${(fs.statSync(outPath).size / 1024 / 1024).toFixed(1)} MB`);
