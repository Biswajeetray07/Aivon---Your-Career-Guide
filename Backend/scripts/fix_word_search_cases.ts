import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({ log: ['error'] });

async function run() {
  const p = await prisma.problem.findFirst({
    where: { title: "Word Search" },
    include: { testCases: true },
  });

  if (!p) {
    console.log("Problem 'Word Search' not found.");
    return;
  }

  console.log(`Found problem: ${p.title} with ${p.testCases.length} test cases.`);

  for (const tc of p.testCases) {
    if (tc.expected.includes("Error:") || tc.expected.includes("missing")) {
      console.log(`\nFixing test case ID: ${tc.id}`);
      console.log(`Input: ${tc.input}`);
      console.log(`Old Expected: ${tc.expected}`);
      
      // Determine correct expected output based on the input
      let newExpected = "false";
      if (tc.input.includes('"word": "ABCB"')) {
          newExpected = "false";
      } else if (tc.input.includes('"word": "ABCCED"')) {
          newExpected = "true";
      } else if (tc.input.includes('"word": "SEE"')) {
          newExpected = "true";
      } else if (tc.input.includes('"word": "BDFH"')) {
          newExpected = "false";
      } else if (tc.input.includes('"word": "BD"')) {
          newExpected = "true";
      }

      console.log(`New Expected: ${newExpected}`);
      
      await prisma.testCase.update({
          where: { id: tc.id },
          data: { expected: newExpected }
      });
      console.log("Updated.");
    }
  }

  console.log("\nDone.");
}

run().catch(console.error);
