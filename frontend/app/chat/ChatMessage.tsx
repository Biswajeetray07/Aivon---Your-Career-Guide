"use client";

import { Bot, User, Copy, RotateCcw, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "./MarkdownRenderers";
import type { Message } from "./types";

interface ChatMessageProps {
  msg: Message;
  idx: number;
  isLast: boolean;
  copiedId: number | null;
  activeTool: string | null;
  onCopy: (text: string, id: number) => void;
  onRegenerate: () => void;
}

export function ChatMessage({ msg, idx, isLast, copiedId, activeTool, onCopy, onRegenerate }: ChatMessageProps) {
  return (
    <div className={`flex gap-3 md:gap-5 relative z-20 ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 border shadow-sm hidden sm:flex backdrop-blur-md ${
        msg.role === "user" 
        ? "bg-[#00E5B0]/10 border-[#00E5B0]/30 text-[#00E5B0] shadow-[0_0_15px_rgba(0,229,176,0.2)]" 
        : "bg-[#00C2FF]/10 border-[#00C2FF]/30 text-[#00C2FF] shadow-[0_0_15px_rgba(0,229,176,0.2)]"
      }`}>
        {msg.role === "user" ? <User className="w-4 h-4 md:w-5 md:h-5" /> : <Bot className="w-4 h-4 md:w-5 md:h-5" />}
      </div>
      
      {/* Bubble */}
      <div className={`p-5 md:p-6 rounded-2xl max-w-[90%] sm:max-w-[85%] md:max-w-[80%] break-words min-w-0 backdrop-blur-xl border ${
        msg.role === "user" 
        ? "bg-[#0A0F14]/60 border-[#00E5B0]/10 text-white rounded-tr-sm shadow-[0_4px_30px_rgba(0,229,176,0.05)]" 
        : "bg-[#0A0F14]/80 border-[#00C2FF]/10 text-[#E2E8F0] rounded-tl-sm shadow-[0_4px_30px_rgba(0,229,176,0.05)]"
      }`}>
        {/* Role Label */}
        <div className={`text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-bold mb-3 md:mb-4 flex items-center gap-2 ${msg.role === "user" ? 'justify-end' : 'justify-start'}`}>
          {msg.role === "user" ? (
            <>
              <span className="text-[#00E5B0]/80">OPERATIVE //</span>
              <span className="w-1.5 h-1.5 rounded-[1px] bg-[#00E5B0] shadow-[0_0_8px_#00E5B0]" />
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-[1px] bg-[#00C2FF] shadow-[0_0_8px_#00E5B0] animate-pulse" />
              <span className="text-[#00C2FF]/80">NEXUS // AI</span>
            </>
          )}
        </div>

        {/* Content */}
        <div className={`whitespace-pre-wrap text-[13px] leading-relaxed font-geist-mono overflow-hidden ${msg.role === "user" ? "" : "prose prose-invert prose-p:text-[#E2E8F0] prose-li:text-[#E2E8F0] prose-strong:text-[#00E5B0] prose-code:text-[#00C2FF] prose-code:bg-[#05070A]/50 prose-code:border prose-code:border-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-pre:bg-[#05070A]/80 prose-pre:border prose-pre:border-white/5 prose-pre:shadow-inner prose-a:text-[#00C2FF] prose-a:underline prose-a:underline-offset-4 prose-pre:max-w-full prose-pre:overflow-x-auto"}`}>
          {msg.isThinking ? (
            <span className="inline-flex gap-1 items-center h-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C2FF] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C2FF] animate-bounce delay-150" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C2FF] animate-bounce delay-300" />
            </span>
          ) : msg.role === "assistant" ? (
            <div className="relative">
              <MarkdownContent content={msg.content} />
              {msg.isStreaming && !activeTool && <span className="inline-block w-2.5 h-4 ml-1.5 bg-[#00C2FF] animate-pulse align-middle shadow-[0_0_8px_#00C2FF]" />}
            </div>
          ) : (
            <>
              {msg.content}
              {msg.isStreaming && !activeTool && <span className="inline-block w-2.5 h-4 ml-1.5 bg-[#00C2FF] animate-pulse align-middle shadow-[0_0_8px_#00C2FF]" />}
            </>
          )}
        </div>
        
        {/* Actions */}
        {msg.role === "assistant" && !msg.isStreaming && (
          <div className="mt-4 pt-3 border-t border-[#00C2FF]/10 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2.5 text-[#00C2FF]/50 hover:text-[#00C2FF] hover:bg-[#00C2FF]/10 font-mono text-[9px] tracking-widest uppercase transition-all"
                onClick={() => onCopy(msg.content, idx)}
              >
                {copiedId === idx ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                {copiedId === idx ? "COPIED" : "COPY"}
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-md text-[#00C2FF]/50 hover:text-[#00C2FF] hover:bg-[#00C2FF]/10">
                <ThumbsUp className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-md text-[#00E5B0]/50 hover:text-[#00E5B0] hover:bg-[#00E5B0]/10">
                <ThumbsDown className="w-3.5 h-3.5" />
              </Button>
              {isLast && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onRegenerate}
                  className="h-8 px-2.5 ml-2 text-[#FF2A2A]/60 hover:text-[#FF2A2A] hover:bg-[#FF2A2A]/10 border border-[#FF2A2A]/20 font-mono text-[9px] tracking-widest uppercase"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  REGENERATE
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
