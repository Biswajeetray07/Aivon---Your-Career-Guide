import axios from "axios";
import { askGeminiChat } from "./geminiPipeline";

export type AiTaskType = "error_fix" | "complexity" | "optimize" | "dry_run" | "hint" | "concept" | "chat" | "improve";

const IS_PROD = process.env.NODE_ENV === "production";
const HAS_GEMINI = !!process.env.GOOGLE_API_KEY;

const OLLAMA_URL = process.env.OLLAMA_API_URL || "http://127.0.0.1:11434/api/generate";
const OLLAMA_CHAT_URL = process.env.OLLAMA_CHAT_API_URL || "http://127.0.0.1:11434/api/chat";

export const MASTER_SYSTEM_PROMPT = `You are Aivon AI, an expert competitive programming mentor and senior software engineer.

Your role is to help users solve Data Structures and Algorithms problems efficiently while teaching clear problem-solving thinking.

Guidelines:
- Be precise and technically correct.
- Prefer optimal algorithms when possible.
- Explain reasoning step-by-step but concisely.
- Highlight time and space complexity.
- When fixing code, preserve the user's style when reasonable.
- Never hallucinate problem constraints.
- If information is missing, ask briefly.

Tone:
- supportive but professional
- concise
- developer-focused
- no unnecessary fluff

Output formatting:
- Use clean markdown when helpful.
- Use code blocks for code.
- Keep responses structured and readable.`;

// ── Legacy Function (Maintained for backwards compatibility for hint/concept) ────────
export function selectModel(taskType: AiTaskType): string {
  const coderTasks = ["error_fix", "complexity", "optimize", "dry_run"];
  if (coderTasks.includes(taskType)) {
    return "qwen2.5-coder:7b";
  }
  return "qwen3:8b";
}

export function getRecommendedOptions(taskType: AiTaskType) {
  const model = selectModel(taskType);
  if (model === "qwen2.5-coder:7b") {
     return { temperature: 0.15, top_p: 0.9, num_ctx: 4096, num_predict: 300 };
  } else {
     return { temperature: 0.40, top_p: 0.9, num_ctx: 4096, num_predict: 400 };
  }
}

interface OllamaRequestParams {
  taskType: AiTaskType;
  prompt: string;
  stream?: boolean;
  format?: string;
}

export async function askOllama(params: OllamaRequestParams) {
  const { taskType, prompt, stream = false, format } = params;
  const model = selectModel(taskType);
  const options = getRecommendedOptions(taskType);

  // Prevent JSON truncation on legacy models
  if (format === "json") {
    options.num_predict = -1;
  }

  const fullPrompt = `${MASTER_SYSTEM_PROMPT}\n\n${prompt}`;

  try {
    const payload: any = { model, prompt: fullPrompt, stream, options };
    if (format) payload.format = format;

    const response = await axios.post(
      OLLAMA_URL,
      payload,
      { responseType: stream ? "stream" : "json", timeout: 60000 }
    );
    return response;
  } catch (error: any) {
    console.error("🔥 OLLAMA RUNTIME ERROR:", error?.message);
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      throw new Error("Ollama daemon is offline. Please run 'ollama serve' in your terminal.");
    }
    throw new Error("AI Assistant is currently unavailable.");
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OllamaChatParams {
  messages: ChatMessage[];
  stream?: boolean;
  modelOverride?: string;
  signal?: AbortSignal;
}

export async function askOllamaChat(params: OllamaChatParams) {
  const { messages, stream = false, modelOverride, signal } = params;

  // 🚀 PRODUCTION AI (Gemini Flash)
  // If we have a key and are in production, use Gemini as the primary engine.
  // It's fast, free (for portfolio volume), and requires 0 local setup for visitors.
  if (HAS_GEMINI && IS_PROD) {
    try {
      return await askGeminiChat({ messages });
    } catch (error: any) {
      console.error("⚠️ GEMINI PRODUCTION ERROR:", error?.message);
      
      // ✨ PORTFOLIO FALLBACK MODE
      // If the API key expires or fails, don't show an error to the recruiter.
      // Show a high-quality "Portfolio Mock Response" instead.
      return {
        data: {
          message: {
            content: "### 🌟 Aivon Neural Link (Demo Mode)\n\nI am currently operating in **Portfolio Mode**. While my live neural connection is currently resting, I can tell you that as Aivon AI, I am built to be your ultimate DSA partner. \n\nI specialize in tracing code logic, finding infinite loops, and teaching you the intuition behind complex algorithms. If you're a recruiter, this project demonstrates a full-stack **Dual-Stage AI Pipeline** that I usually use to analyze code in real-time!"
          }
        }
      };
    }
  }
  
  // Aivon Learning Brain v2 setting for qwen3:8b, but allow coder override
  const model = modelOverride || "qwen3:8b";
  const predictCount = model === "qwen2.5-coder:7b" ? 1000 : 1500;
  const temp = model === "qwen2.5-coder:7b" ? 0.1 : 0.35;
  const options = { temperature: temp, top_p: 0.9, num_ctx: 4096, num_predict: predictCount };

  try {
    const payload: any = { model, messages, stream, options };

    const response = await axios.post(
      OLLAMA_CHAT_URL,
      payload,
      { responseType: stream ? "stream" : "json", timeout: 300000, signal }
    );
    return response;
  } catch (error: any) {
    console.error("🔥 OLLAMA CHAT ERROR:", error?.message);
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      throw new Error("Ollama daemon is offline. Please run 'ollama serve' in your terminal.");
    }
    throw new Error("AI Assistant is currently unavailable.");
  }
}
// ────────────────────────────────────────────────────────────────────────────────────

// ── New Dual-Stage Architecture (Coder → Teacher) ───────────────────────────────────

interface DualStageOptions {
  coderSystemPrompt: string;
  coderPrompt: string;
  teacherSystemPrompt: string;
  teacherPromptGenerator: (coderJson: string) => string;
}

/**
 * Runs the Coder Brain (Stage 1) to get strict, technical JSON analysis.
 */
async function runCoderBrain(system: string, prompt: string): Promise<string> {
  const fullPrompt = `${system}\n\n${prompt}`;
  
  if (HAS_GEMINI && IS_PROD) {
    const { data } = await askGeminiChat({ 
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }] 
    });
    return data.message.content;
  }

  try {
    const res = await axios.post("http://127.0.0.1:11434/api/generate", {
      model: "qwen2.5-coder:7b",
      prompt: fullPrompt,
      stream: false,
      format: "json",
      options: { temperature: 0.15, num_predict: 2500, num_ctx: 4096 }
    }, { timeout: 60000 });
    return extractOllamaText(res.data);
  } catch (err: any) {
    console.error("🔥 OLLAMA CODER ERROR:", err?.message);
    if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
      throw new Error("Ollama daemon is offline. Please run 'ollama serve' in your terminal.");
    }
    throw new Error("Coder brain analysis failed.");
  }
}

/**
 * Runs the Teacher Brain (Stage 2) to convert the technical JSON into student-friendly markdown.
 */
async function runTeacherBrain(system: string, prompt: string): Promise<string> {
  const fullPrompt = `${system}\n\n${prompt}`;

  if (HAS_GEMINI && IS_PROD) {
    const { data } = await askGeminiChat({ 
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }] 
    });
    return data.message.content;
  }

  try {
    const res = await axios.post("http://127.0.0.1:11434/api/generate", {
      model: "qwen3:8b",
      prompt: fullPrompt,
      stream: false,
      format: "json", // Essential: forces Ollama to guarantee structural JSON integrity
      options: { temperature: 0.35, num_predict: 2500, num_ctx: 4096 }
    }, { timeout: 60000 });
    return extractOllamaText(res.data);
  } catch (err: any) {
    console.error("🔥 OLLAMA TEACHER ERROR:", err?.message);
    if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
      throw new Error("Ollama daemon is offline. Please run 'ollama serve' in your terminal.");
    }
    throw new Error("Teacher brain explanation failed.");
  }
}

/**
 * Orchestrates the full Stage 1 -> Stage 2 pipeline.
 */
export async function dualStageAnalysis(opts: DualStageOptions): Promise<string> {
  // Stage 1: Fast, technical extraction
  const coderAnalysisJson = await runCoderBrain(opts.coderSystemPrompt, opts.coderPrompt);
  
  // Stage 1.5: Smart Fast-Path
  let parsed: any = null;
  try {
    const rawText = coderAnalysisJson.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawText);
  } catch (e) {
    console.warn("Fast-path check skipped: Failed to parse Coder JSON.");
  }

  if (parsed?.is_correct === true && parsed?.confidence?.toLowerCase() === "high") {
    console.log("🚀 Dual-Stage: Taking Fast-Path for perfect code!");
    
    // We must return a JSON string so that extractors in get-code-feedback/explain-error can parse it.
    // They both expect different fields, but we can provide a union of them.
    const fastJson = {
      // explain-error fields
      summary: "🌟 Perfect Code! Your logic is correct and handles the problem constraints well.",
      rootCause: "No issues found. The solution is optimal and clean.",
      fixSteps: ["No fixes needed."],
      conceptToReview: "Mastery! Keep practicing similar problems.",
      
      // performance-review fields
      feedback: "Your code is perfectly correct and handles the problem constraints well.",
      timeComplexity: parsed.time_complexity || 'O(1)',
      spaceComplexity: parsed.space_complexity || 'O(1)',
      improvementTip: parsed.optimization_suggestions?.length > 0 ? parsed.optimization_suggestions[0] : "Your implementation is already optimal.",
      interviewNote: "Excellent work! This is exactly what interviewers look for: clean, correct, and optimal code."
    };
    
    return JSON.stringify(fastJson);
  }

  // Stage 2: Friendly, pedagogic markdown formulation for non-perfect cases
  const finalTeacherResponse = await runTeacherBrain(
    opts.teacherSystemPrompt, 
    opts.teacherPromptGenerator(coderAnalysisJson)
  );

  return finalTeacherResponse;
}
// ────────────────────────────────────────────────────────────────────────────────────

export function extractOllamaText(data: any): string {
  if (!data) return "";
  if (typeof data === "string") return data;
  
  let result = "";
  if (data.thinking) result += `<think>\n${data.thinking}\n</think>\n\n`;
  if (data.message?.thinking) result += `<think>\n${data.message.thinking}\n</think>\n\n`;
  if (data.response) result += data.response;
  
  if (data.message?.content) {
    result += data.message.content;
  }
  
  return result.trim() || JSON.stringify(data);
}
