export function aggregateResults(results: any[], mode: "run" | "submit") {
  const total = results.length;
  let passed = 0;
  let failedCase = null;
  let finalVerdict = "Accepted";

  for (let i = 0; i < results.length; i++) {
    const r = results[i];

    if (r.verdict === "Accepted") {
      passed++;
      continue;
    }

    // Set the overall verdict to the first failure encountered
    if (finalVerdict === "Accepted") {
       finalVerdict = r.verdict;
       failedCase = i + 1;
    }

    // SUBMIT mode → stop execution on first failure to mimic Real Judge Behavior
    // RUN mode → evaluate all cases (so users see all samples)
    if (mode === "submit") break;
  }

  // If no test cases are present but it's executed, assume internal error
  if (total === 0) {
    finalVerdict = "Internal Error";
  }

  return {
    verdict: finalVerdict,
    passed,
    total,
    failedCase,
    testCaseResults: results
  };
}
