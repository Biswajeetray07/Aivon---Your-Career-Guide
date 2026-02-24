import prisma from "../src/services/prisma";
import { runCode, runRawPython } from "../src/utils/judge0";
import { wrapCode, formatStdin } from "../src/utils/code-runner";
import { runSingleTest } from "../src/utils/judge-core/runSingleTest";

const updatedBuggyCode = `
from typing import List
class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        if len(nums1) > len(nums2):
            nums1, nums2 = nums2, nums1
        m, n = len(nums1), len(nums2)
        left, right = 0, m
        while left <= right:
            i = (left + right) // 2
            j = (m + n + 1) // 2 - i
            left1 = float("-inf") if i == 0 else nums1[i - 1]
            right1 = float("inf") if i == m else nums1[i]
            left2 = float("-inf") if j == 0 else nums2[j - 1]
            right2 = float("inf") if j == n else nums2[j]
            if left1 <= right2 and left2 <= right1:
                # correct partition
                if (m + n) % 2 == 0:
                    return (max(left1, left2) + min(right1, right2)) / 2.0
                else:
                    return max(left1, left2)
            
            elif left1 > right2:
                right = i - 1
            else:
                left = i + 1
        
        return 0.0
`;

async function main() {
  const p = await prisma.problem.findUnique({ where: { slug: "median-of-two-sorted-arrays" }, include: { judgeMeta: true } });
  
  if (!p || !p.judgeMeta) {
    console.log("No meta setup!");
    process.exit(1);
  }

  console.log("TESTING GENERATOR:");
  let genRes = await runRawPython(p.judgeMeta.generatorCode);
  
  if (genRes.status.id === 3 && genRes.stdout) {
     const cases = genRes.stdout.trim().split("\\n\\n").map(s => s.trim()).filter(Boolean);
     console.log(`Generated ${cases.length} cases`);
     
     for (let i = 0; i < cases.length; i++) {
        const stressInput = cases[i];
        const oracleRes = await runRawPython(p.judgeMeta.oracleCode!, stressInput);
        if (oracleRes.status.id !== 3) continue;
        
        const expected = oracleRes.stdout!.trim();
        const wrapped = wrapCode(updatedBuggyCode, "python", "Solution().findMedianSortedArrays", "array");
        const formatted = formatStdin(stressInput);
        const userRes = await runCode(wrapped, "python", formatted);
        const single = await runSingleTest({ rawExec: userRes, expectedOutput: expected, testInput: stressInput, language: "python", judgeMode: "exact" });
        
        console.log(`[CASE ${i+1}] ORACLE EXPECTS:`, expected);
        console.log(`[CASE ${i+1}] BUGGY CODE PRODUCED:`, single.actualOutput);
        console.log(`[CASE ${i+1}] VERDICT:`, single.verdict);
        
        if (single.verdict !== "Accepted") {
            console.log("\\n>>> DIFFERENTIAL TESTING ENGINE CAUGHT THE BUG! <<<\\n");
            process.exit(0);
        }
     }
     console.log("\\n>>> BUG PASSED ALL TESTS (ENGINE FAILED) <<<\\n");
  }
}
main().catch(console.error);
