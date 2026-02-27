import axios from "axios";
import prisma from "../../services/prisma";
import { extractOllamaText } from "./ollamaPipeline";

const OLLAMA_URL = process.env.OLLAMA_API_URL || "http://127.0.0.1:11434/api/generate";

/**
 * Strips common conversational filler and greetings from a message.
 */
function cleanMessage(msg: string): string {
  let cleaned = msg.toLowerCase();
  
  // Remove greetings and pleasantries
  const fillers = [
    /^(hi|hello|hey|yo|hola|greetings)\b/gi,
    /can you (please )?((help me (with|understand|debug))|(explain|fix|write|solve))/gi,
    /i (need|want) (help (with|understand|debug)|(to (explain|fix|write|solve)))/gi,
    /please (explain|fix|write|solve)/gi,
    /how do i/gi,
    /what is the (best|way to)/gi,
    /could you/gi,
    /[\.,?!;:\(\)]/g // Remove basic punctuation
  ];

  fillers.forEach(pattern => {
    cleaned = cleaned.replace(pattern, " ").trim();
  });

  return cleaned.replace(/\s+/g, " ").trim();
}

/**
 * Generates a title using simple keyword heuristics if the message is short/simple.
 */
function heuristicTitle(cleanedMsg: string): string | null {
  const words = cleanedMsg.split(" ");
  
  if (words.length > 8 || words.length === 0) return null; // Too long for simple heuristic or empty

  const isDebug = ["bug", "error", "fix", "failing", "tle", "runtime", "issue", "wrong"].some(w => words.includes(w));
  const isExplain = ["explain", "how", "what", "why", "understand", "concept", "intuition"].some(w => words.includes(w));
  const isOptimize = ["optimize", "faster", "better", "improve", "complexity"].some(w => words.includes(w));
  const isSolve = ["solve", "code", "solution", "implement", "write"].some(w => words.includes(w));

  // Extract core domain words (naive approach: just take biggest technical sounding words)
  const skipWords = new Set(["a", "an", "the", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "am", "it", "my", "this", "that", "code", "problem"]);
  const coreTopics = words.filter(w => w.length > 2 && !skipWords.has(w)).slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  if (!coreTopics) return null;

  if (isDebug) return `Debug ${coreTopics}`;
  if (isExplain) return `Explain ${coreTopics}`;
  if (isOptimize) return `Optimize ${coreTopics}`;
  if (isSolve) return `Solve ${coreTopics}`;

  return coreTopics;
}

/**
 * Fallback to lightweight AI model for complex prompts.
 */
async function aiTitle(rawMsg: string): Promise<string | null> {
  const systemPrompt = `Summarize this user intent into a 3–6 word chat title. Use Title Case. Do not use any punctuation. Do not use quotes. Do not say "Title: ". Just output the raw words.
Example 1: Fix Binary Search Bug
Example 2: Explain Dynamic Programming
Example 3: Optimize Two Sum Solution`;

  const fullPrompt = `${systemPrompt}\n\nUser Message: "${rawMsg.substring(0, 500)}"`;

  try {
    const res = await axios.post(OLLAMA_URL, {
      model: "qwen3:8b", // Fast, lightweight model
      prompt: fullPrompt,
      stream: false,
      options: { temperature: 0.1, num_predict: 20, top_p: 0.5 }
    }, { timeout: 10000 });

    let title = extractOllamaText(res.data).trim();
    
    // Clean up potential AI artifacts
    title = title.replace(/^Title:\s*/i, "").replace(/['"]/g, "").replace(/\.$/, "").trim();
    
    return title.split(" ").slice(0, 6).join(" "); // Enforce max 6 words
  } catch (e) {
    console.error("AI Title generation failed:", e);
    return null;
  }
}

/**
 * Main orchestrator to generate and persist a title for a thread asynchronously.
 */
export async function generateAndPersistThreadTitle(threadId: string, firstMessage: string) {
  try {
    // 1. Check if it actually needs titling
    const thread = await prisma.chatThread.findUnique({ where: { id: threadId }, select: { isAutoRetitled: true } });
    if (!thread || thread.isAutoRetitled) return;

    // Edge case constraints
    if (!firstMessage || firstMessage.trim().length === 0) return;
    
    // 2. Try fast deterministic approach
    const cleaned = cleanMessage(firstMessage);
    let title = heuristicTitle(cleaned);

    // 3. Try AI approach if heuristic fails or message is very long (like a big code paste)
    if (!title && firstMessage.length > 15) {
      title = await aiTitle(firstMessage);
    }

    // 4. Default fallback
    if (!title) {
      title = "System Request"; 
    }

    // Capitalize properly if AI didn't
    title = title.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

    // 5. Update Database
    await prisma.chatThread.update({
      where: { id: threadId },
      data: {
        title,
        isAutoRetitled: true,
        lastAutoUpdatedAt: new Date()
      }
    });

    console.log(`[Titler] Automatically retitled thread ${threadId} -> "${title}"`);
  } catch (e) {
    console.error(`[Titler] Failed to auto-retitle thread ${threadId}:`, e);
  }
}
