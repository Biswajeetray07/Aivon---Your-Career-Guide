import { detectProblemTypeFromInput } from "../src/utils/code-runner";
import prisma from "../src/services/prisma";

async function analyze() {
  const problems = await prisma.problem.findMany({
    include: { testCases: true }
  });

  console.log(`Analyzing ${problems.length} problems...`);

  let arrayCount = 0;
  let matrixCount = 0;
  let llCount = 0;
  let treeCount = 0;
  let graphCount = 0;

  for (const prob of problems) {
    const rawType = (prob as any).problemType ?? "array";
    let effectiveType = rawType;
    let newEffectiveType = rawType;
    let inputPreview = "NO_INPUT";

    if (prob.testCases.length > 0) {
      inputPreview = prob.testCases[0].input;
      effectiveType = detectProblemTypeFromInput(inputPreview, rawType);
      
      // Calculate what the NEW heuristic would give
      let inferred = rawType;
      if (rawType === "array") {
        const trimmed = inputPreview.trim().toLowerCase();
        if (/\b(l1|l2|list1|list2|head)\b/i.test(trimmed)) inferred = "linked_list";
        else if (/\b(root|tree)\b/i.test(trimmed)) inferred = "binary_tree";
        else if (/\b(adjlist|graph|edges)\b/i.test(trimmed)) inferred = "graph";
        else if (/\b(board|matrix|grid)\b/i.test(trimmed)) inferred = "matrix";
      }
      newEffectiveType = inferred;
    }

    if (newEffectiveType !== effectiveType || effectiveType === "matrix") {
      console.log(`[${prob.title}] (ID: ${prob.id})`);
      console.log(`  Current Effective Type: ${effectiveType}`);
      console.log(`  New Fix Effective Type: ${newEffectiveType}`);
      console.log(`  Input snippet: ${inputPreview.slice(0, 100).replace(/\n/g, " ")}`);
      console.log("-----------------------------------------");
    }

    if (newEffectiveType === "array") arrayCount++;
    if (newEffectiveType === "matrix") matrixCount++;
    if (newEffectiveType === "linked_list") llCount++;
    if (newEffectiveType === "binary_tree") treeCount++;
    if (newEffectiveType === "graph") graphCount++;
  }

  console.log("--- FINAL COUNTS ---");
  console.log("Array:", arrayCount);
  console.log("Matrix:", matrixCount);
  console.log("Linked List:", llCount);
  console.log("Binary Tree:", treeCount);
  console.log("Graph:", graphCount);
}

analyze().finally(() => prisma.$disconnect());
