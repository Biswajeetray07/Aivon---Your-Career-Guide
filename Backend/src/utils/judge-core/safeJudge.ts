export async function safeJudge(runFn: () => Promise<any>) {
  try {
    return await runFn();
  } catch (err: any) {
    console.error("🔥 JUDGE INTERNAL ERROR:", err);

    return {
       success: false,
       verdict: "Internal Error",
       error: {
         type: "JudgeInternalError",
         message: err.message || "Judge failed unexpectedly"
       }
    };
  }
}
