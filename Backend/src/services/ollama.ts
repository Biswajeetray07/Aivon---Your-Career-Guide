const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/chat";

/**
 * Strip `<think>...</think>` blocks that qwen3 models may emit,
 * even when format:"json" is used.
 */
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

export async function ollamaChat(
  model: string,
  system: string,
  user: string,
  options: { temperature?: number; format?: "json" } = {}
): Promise<string> {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      format: options.format ?? undefined,
      stream: false,
      options: { temperature: options.temperature ?? 0.4 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama error ${res.status}: ${errText}`);
  }
  const data = (await res.json()) as any;
  const raw = data.message?.content ?? "{}";
  return stripThinking(raw);
}

export const MODELS = {
  FAST: "qwen3:8b",
  CODER: "qwen2.5-coder:14b",
} as const;
