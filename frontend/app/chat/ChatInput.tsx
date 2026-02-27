"use client";

import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  isSidebarOpen: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function ChatInput({ input, isLoading, isSidebarOpen, onInputChange, onSend, onStop, onKeyDown }: ChatInputProps) {
  return (
    <div className={`relative z-20 shrink-0 w-full mt-2 transition-all duration-500 ${isSidebarOpen ? "xl:max-w-4xl mx-auto" : "max-w-6xl mx-auto px-4 lg:px-0"}`}>
      
      {/* Stop Generation */}
      <div className={`absolute -top-14 left-1/2 -translate-x-1/2 transition-all duration-300 ${isLoading ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
        <Button 
          onClick={onStop}
          variant="outline"
          className="h-9 px-4 rounded-full bg-[#0A0F14]/90 backdrop-blur-md border border-[#FF2A2A]/40 text-[#FF2A2A] hover:bg-[#FF2A2A]/10 hover:text-[#FF2A2A] hover:border-[#FF2A2A] font-space-grotesk font-bold uppercase tracking-widest text-[10px] shadow-[0_0_15px_rgba(255,42,42,0.15)] flex items-center gap-2 group"
        >
          <div className="w-2.5 h-2.5 bg-[#FF2A2A] rounded-[1px] group-hover:shadow-[0_0_8px_#FF2A2A] transition-all" />
          STOP GENERATION
        </Button>
      </div>

      {/* Input Pill */}
      <div className="relative flex items-center gap-2 md:gap-3 bg-[#060D10]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-2 focus-within:border-[#00C2FF]/50 focus-within:shadow-[0_0_30px_rgba(0,194,255,0.15)] transition-all duration-300 overflow-hidden w-full">
        <span className="text-[#00C2FF] pl-4 md:pl-5 font-mono text-[15px] font-bold self-center animate-pulse hidden sm:block">&gt;</span>
        <Textarea 
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="ENTER COMMAND OR QUERY..."
          className="min-h-[44px] md:min-h-[50px] max-h-[150px] md:max-h-[200px] border-0 focus-visible:ring-0 bg-transparent resize-none py-3 md:py-3.5 text-sm font-geist-mono text-white placeholder:text-white/30 placeholder:tracking-[0.15em] w-full"
          disabled={isLoading}
        />
        <Button 
          id="transmit-btn"
          onClick={onSend}
          disabled={!input.trim() || isLoading}
          className="h-[44px] md:h-[50px] px-6 flex-shrink-0 bg-gradient-to-r from-[#00C2FF] to-[#00C2FF] hover:brightness-125 text-[#05070A] font-bold font-space-grotesk tracking-widest text-[11px] uppercase rounded-[1.5rem] disabled:opacity-30 transition-all group shadow-[0_0_20px_rgba(0,194,255,0.3)] self-center"
        >
          <span className="hidden sm:inline">TRANSMIT</span> <Send className="w-4 h-4 sm:ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </Button>
      </div>
      <div className="text-center mt-3 text-[9px] md:text-[10px] text-white/30 font-mono uppercase tracking-[0.3em]">
        Nexus AI Protocol // <span className="text-[#00C2FF]">End-To-End Encrypted</span>
      </div>
    </div>
  );
}
