import prisma from "../src/services/prisma";

async function run() {
  const meta = await prisma.problemJudgeMeta.findFirst({
    where: { problem: { slug: "median-of-two-sorted-arrays" } }
  });

  if (!meta) {
    console.log("No meta found for median-of-two-sorted-arrays");
    process.exit(1);
  }

  const generatorCode = `import random
import json

def generate_test_case():
    m = random.randint(0, 50)
    n = random.randint(0, 50)
    nums1 = sorted(random.sample(range(-1000, 1000), m)) if m > 0 else []
    nums2 = sorted(random.sample(range(-1000, 1000), n)) if n > 0 else []
    # format exactly like leetcode (one argument per line)
    return json.dumps(nums1).replace(' ', '') + "\\n" + json.dumps(nums2).replace(' ', '')

if __name__ == "__main__":
    for _ in range(5):
        print(generate_test_case())
        print("") # Extra newline for \\n\\n separation
`;

  const oracleCode = `import sys
import json
from typing import List

def findMedianSortedArrays(nums1: List[int], nums2: List[int]) -> float:
    merged = sorted(nums1 + nums2)
    n = len(merged)
    if n == 0: return 0.0
    if n % 2 == 0:
        return (merged[n//2 - 1] + merged[n//2]) / 2.0
    else:
        return float(merged[n//2])

def main():
    lines = [line.strip() for line in sys.stdin.read().splitlines() if line.strip()]
    if len(lines) >= 2:
        nums1 = json.loads(lines[0])
        nums2 = json.loads(lines[1])
        result = findMedianSortedArrays(nums1, nums2)
        print(result)

if __name__ == "__main__":
    main()
`;

  await prisma.problemJudgeMeta.update({
    where: { id: meta.id },
    data: { generatorCode, oracleCode }
  });

  console.log("SUCCESS: Oracle Patched!");
}

run().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
