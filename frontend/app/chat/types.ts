// Shared types for the Chat module
export type Message = {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  isThinking?: boolean;
};

export type Thread = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};
