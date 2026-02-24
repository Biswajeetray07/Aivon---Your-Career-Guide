import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import prisma from "../services/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";
import { askOllamaChat, extractOllamaText, type ChatMessage } from "../utils/ai/ollamaPipeline";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string()
});

const bodySchema = z.object({
  problemId: z.string(),
  userCode: z.string().optional(),
  language: z.string().optional(),
  messages: z.array(messageSchema) // Recent conversation history
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "AiChat",
  path: "/api/ai/chat",
  method: "POST",
  emits: [],
  flows: ["ai-flow"],
  middleware: [authMiddleware()],
  bodySchema,
  responseSchema: {
    200: z.object({ reply: z.string() }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
  },
  includeFiles: ["../services/prisma.ts", "../utils/jwt.ts", "../middlewares/auth.middleware.ts", "../utils/ai/ollamaPipeline.ts"],
};

function classifyChatMode(msg: string): string {
  const lowercaseMsg = msg.toLowerCase();
  
  if (/^(hi|hello|hey|yo|hola|greetings)\b/i.test(lowercaseMsg)) return "greeting";
  if (/thanks?|thank you/i.test(lowercaseMsg)) return "gratitude";
  if (/full code|solution|give answer|code for this|write code/i.test(lowercaseMsg)) return "full_solution";
  if (/error|bug|fix|failing|tle|runtime/i.test(lowercaseMsg)) return "debug";
  if (/hint|guide|step|explain|intuition|logic|math/i.test(lowercaseMsg)) return "hint";

  return "chat";
}

function buildSystemPrompt(mode: string): string {
  switch (mode) {
    case "greeting":
    case "gratitude":
    case "chat":
      return `
You are Aivon AI, a friendly, natural AI assistant.
Speak conversationally like a human.
Do NOT use rigid sections unless explicitly asked.
Keep responses fluid and context-aware.
`;

    case "problem_help":
    case "hint":
      return `
You are a coding mentor for an algorithmic problem.

When the user asks for guidance, structure your response using:

### 🧠 Insight
### 🔧 Guidance
### 💡 Next Step

Do not reveal the full solution unless explicitly asked.
Apply bold text for emphasis.
Only respond using cleanly formatted Markdown.
`;

    case "full_solution":
    case "solution":
      return `
You are an expert programmer.
Provide clean, correct, complete code.
Explain briefly if helpful.
Only respond using cleanly formatted Markdown.
`;

    case "debug":
      return `
You are a senior debugging engineer reviewing code logic.
Identify the root cause first, then fix.
Be precise and structured.
Apply bold text for emphasis.
Only respond using cleanly formatted Markdown.
`;

    default:
      return `You are Aivon AI, a helpful coding mentor.`;
  }
}

export const handler: any = async (req: any, { logger }: { logger: any }) => {
  try {
    const { problemId, userCode, language, messages } = bodySchema.parse(req.body);

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { title: true, description: true, difficulty: true, constraints: true, tags: true },
    });
    if (!problem) return { status: 404, body: { error: "Problem not found" } };

    // Get the latest user message to classify intent
    const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";
    const mode = classifyChatMode(lastUserMessage);

    if (mode === "greeting") {
      logger.info("Fast greeting path taken", { problemId });
      return { status: 200, body: { reply: "Hey! 👋 I'm Aivon AI. How can I help you today?" } };
    }

    const includeProblemContext = mode === "problem_help" || mode === "debug" || mode === "full_solution";

    // Context Builder Payload Stringified
    const contextObj: any = {};
    if (includeProblemContext) {
      contextObj.problem = {
        title: problem.title,
        description: problem.description.substring(0, 1000), // Trim to save context window
        constraints: problem.constraints || ""
      };
      contextObj.code = {
        latest_code: userCode || "None provided",
        last_error: "",
        language: language || "unknown"
      };
    } else {
      contextObj.problem = { title: problem.title };
    }
    
    contextObj.user = {
      skill_level: "intermediate", // Defaulting as intermediate
      weak_areas: [],
      recent_mistake_pattern: "",
      wrong_submission_count: 0,
      idle_minutes: 0
    };
    contextObj.intent = mode;

    const contextPayload = JSON.stringify(contextObj, null, 2);

    const systemPrompt = `${buildSystemPrompt(mode)}

------------------------------------------------
CONTEXT
${contextPayload}
`;

    const fullMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...(messages as ChatMessage[])
    ];

    const rawResponse = await askOllamaChat({
      messages: fullMessages,
      stream: false,
      modelOverride: mode === "debug" ? "qwen2.5-coder:7b" : "qwen3:8b"
    });
    
    // The response data from ollama /api/chat is typically { message: { role: 'assistant', content: '...' } }
    let rawText = "";
    if (rawResponse.data?.message?.content) {
       rawText = rawResponse.data.message.content;
    } else {
       rawText = extractOllamaText(rawResponse.data);
    }
    
    // Strip <think> block from qwen3 output
    const reply = rawText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    logger.info("Chat generated via Learning Brain v2", { problemId, mode });
    return { status: 200, body: { reply } };
  } catch (err: any) {
    logger.error("Chat generation failed", { error: err.message });
    return { status: 400, body: { error: err.message ?? "Could not generate chat reply" } };
  }
};
