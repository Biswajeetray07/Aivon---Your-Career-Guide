// tests/scripts/healthScore.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('🚀 Initializing Backend Flow Audit & Validation Harness...');

const resultsFile = path.join(process.cwd(), 'tests', 'test-results.json');

try {
  // Execute vitest silently, forcing JSON output.
  // We use npx vitest run so it exits immediately after 1 run.
  console.log('⏳ Running diagnostic tests (Auth, AuthZ, DB, Queue, Logic)...');
  execSync('npx vitest run --reporter=json > tests/test-results.json', { 
    stdio: 'ignore', // Suppress console garble
  });
} catch (e) {
  // Tests failing will throw an ExecException, which is expected during auditing.
  // We catch it so we can parse the JSON anyway.
}

if (!fs.existsSync(resultsFile)) {
  console.error('❌ FATAL: Test results JSON not generated. Ensure Vitest is installed.');
  process.exit(1);
}

try {
  const jsonOutput = fs.readFileSync(resultsFile, 'utf8');
  const results = JSON.parse(jsonOutput);
  
  const total = results.numTotalTests || 0;
  const passed = results.numPassedTests || 0;
  
  if (total === 0) {
    console.error('⚠️ No tests ran. Please check your vitest.config.ts or test files.');
    process.exit(1);
  }

  const percentage = (passed / total) * 100;

  console.log('\n==================================================');
  console.log('📈 BACKEND HEALTH & SECURITY AUDIT SUMMARY');
  console.log('==================================================');
  console.log(`Total Checks Executed : ${total}`);
  console.log(`Checks Passed         : ${passed}`);
  console.log(`Checks Failed         : ${total - passed}`);
  console.log(`\nOverall Health Score  : ${percentage.toFixed(2)}%`);
  
  if (percentage < 100) {
    console.log('\n❌ Action Required: Critical Flow Breaches Detected.');
    console.log('Review the specific test failures to ensure architecture compliance.');
    process.exit(1);
  } else {
    console.log('\n✅ All Critical Pathways Green. Architecture is resilient and ready for scaling.');
    process.exit(0);
  }

} catch (err) {
  console.error('❌ Failed to parse test results:', err);
  process.exit(1);
}
