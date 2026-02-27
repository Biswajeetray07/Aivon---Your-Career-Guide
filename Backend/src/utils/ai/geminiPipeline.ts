import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Executes a chat request using Google Gemini.
 * Matches the interface of askOllamaChat.
 */
export async function askGeminiChat(params: { messages: ChatMessage[] }) {
  const { messages } = params;
  
  // Extract system prompt
  const systemMessage = messages.find(m => m.role === "system");
  const history = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: m.content }]
    }));

  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    systemInstruction: systemMessage?.content
  });

  const chat = model.startChat({
    history: history.slice(0, -1), // Everything except the last message
  });

  const lastMessage = history[history.length - 1].parts[0].text;
  const result = await chat.sendMessage(lastMessage);
  const response = await result.response;
  const text = response.text();

  return {
    data: {
      message: {
        content: text
      }
    }
  };
}

/**
 * Legacy support for non-chat generative tasks.
 */
export async function askGemini(params: { prompt: string }) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(params.prompt);
    const response = await result.response;
    return {
        data: {
            response: response.text()
        }
    };
}
