import prisma from "../src/services/prisma";
import { handler } from "../src/submissions/execute-submission.step";

async function main() {
  const sub = await prisma.submission.findFirst({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "desc" }
  });

  if (!sub) {
    console.log("No queued submissions");
    process.exit(0);
  }

  console.log("Executing submission manually:", sub.id);
  const mockContext = {
    logger: {
      info: (...args: any) => console.log("[INFO]", ...args),
      warn: (...args: any) => console.log("[WARN]", ...args),
      error: (...args: any) => console.error("[ERROR]", ...args),
    },
    emit: async (event: any) => {
      console.log("[EMIT]", event);
    }
  };

  try {
    await handler({ data: { submissionId: sub.id } }, mockContext);
    console.log("Success!");
  } catch (e) {
    console.error("Crash during execution:", e);
  }
}

main().catch(console.error);
