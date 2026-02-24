import prisma from "./src/services/prisma";
async function main() {
  const p = await prisma.problem.findUnique({
    where: { slug: "median-of-two-sorted-arrays" },
    include: { judgeMeta: true }
  });
  console.log("PROBLEM:", p?.title, "hasOracle:", p?.hasOracle);
  console.log("META:", p?.judgeMeta ? "EXISTS" : "NONE");
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
