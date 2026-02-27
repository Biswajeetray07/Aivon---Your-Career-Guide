"use client";

import { Cpu, Sparkles, Trash2, PanelLeftClose, Edit2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Thread } from "./types";

interface ChatSidebarProps {
  threads: Thread[];
  activeThread: string;
  isSidebarOpen: boolean;
  editingThread: string | null;
  editTitleValue: string;
  onToggleSidebar: (open: boolean) => void;
  onNewChat: () => void;
  onLoadHistory: (threadId: string) => void;
  onDeleteThread: (e: React.MouseEvent, threadId: string) => void;
  onClearAll: () => void;
  onStartEditing: (threadId: string, currentTitle: string) => void;
  onEditTitleChange: (value: string) => void;
  onSaveTitle: (threadId: string) => void;
  onCancelEditing: () => void;
}

export function ChatSidebar({
  threads, activeThread, isSidebarOpen, editingThread, editTitleValue,
  onToggleSidebar, onNewChat, onLoadHistory, onDeleteThread, onClearAll,
  onStartEditing, onEditTitleChange, onSaveTitle, onCancelEditing,
}: ChatSidebarProps) {
  return (
    <div 
      className={`flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col z-20 ${
        isSidebarOpen ? "w-72 lg:w-80 opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-[200px] pointer-events-none hidden md:flex"
      } ${!isSidebarOpen && "hidden"}`}
    >
      <div className="h-full flex flex-col relative group">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 relative z-10 w-full justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00C2FF]/10 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,176,0.2)]">
              <Cpu className="text-[#00C2FF] w-4 h-4" />
            </div>
            <h2 className="font-space-grotesk font-bold text-[15px] text-white tracking-widest uppercase text-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Nexus AI</h2>
          </div>
          <Button variant="ghost" size="icon" className="text-[#00C2FF] hover:text-[#00C2FF] hover:bg-white/5 transition-colors" onClick={() => onToggleSidebar(false)}>
            <PanelLeftClose className="w-5 h-5" />
          </Button>
        </div>
        
        {/* New Chat */}
        <Button 
          onClick={onNewChat}
          className="w-full bg-[#00C2FF]/10 hover:bg-[#00C2FF] text-[#00C2FF] hover:text-[#05070A] border border-[#00C2FF]/30 hover:shadow-[0_0_20px_rgba(0,229,176,0.4)] mb-8 justify-start font-mono transition-all duration-300 relative z-10 backdrop-blur-md rounded-xl h-12"
        >
          <Sparkles className="w-4 h-4 mr-3" />
          [ INIT_NEW_UPLINK ]
        </Button>
        
        {/* Thread List */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 relative z-10">
          <h3 className="text-[10px] font-bold text-[#00C2FF]/70 uppercase tracking-[0.2em] mb-4 flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-3 bg-[#00C2FF] shadow-[0_0_8px_rgba(0,194,255,0.5)]" /> Memory Archives
            </div>
            <button 
              onClick={onClearAll}
              className="text-white flex items-center gap-1 group/clear text-[9px] tracking-tighter"
            >
              <Trash2 className="w-2.5 h-2.5" />
              <span>CLEAR_ALL</span>
            </button>
          </h3>
          
          {threads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => { if (editingThread !== thread.id) { onLoadHistory(thread.id); if (window.innerWidth < 768) onToggleSidebar(false); } }}
              className={`w-full text-left px-4 py-3.5 rounded-xl text-xs font-mono transition-all group/thread flex items-center justify-between cursor-pointer backdrop-blur-md border ${
                activeThread === thread.id 
                ? "bg-[#00C2FF]/10 text-[#00C2FF] border-[#00C2FF]/50 shadow-[0_0_20px_rgba(0,229,176,0.15)]" 
                : "bg-[#0A0F14]/40 text-[#00C2FF]/70 border-white/5 hover:bg-[#00C2FF]/10 hover:text-[#00C2FF] hover:border-[#00C2FF]/30"
              }`}
            >
              {editingThread === thread.id ? (
                <div className="flex items-center gap-2 w-full pr-2">
                  <input
                    autoFocus
                    className="flex-1 bg-transparent border-b border-[#00C2FF] text-[#00C2FF] outline-none w-full"
                    value={editTitleValue}
                    onChange={(e) => onEditTitleChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onSaveTitle(thread.id);
                      if (e.key === "Escape") onCancelEditing();
                    }}
                  />
                  <Button size="icon" variant="ghost" className="w-5 h-5 hover:bg-transparent" onClick={(e) => { e.stopPropagation(); onSaveTitle(thread.id); }}>
                    <Check className="w-3 h-3 text-[#00E5B0]" />
                  </Button>
                  <Button size="icon" variant="ghost" className="w-5 h-5 hover:bg-transparent" onClick={(e) => { e.stopPropagation(); onCancelEditing(); }}>
                    <X className="w-3 h-3 text-[#FF2A2A]" />
                  </Button>
                </div>
              ) : (
                <>
                  <span 
                    className="truncate flex-1 tracking-wider leading-relaxed pr-2"
                    title={thread.title || "New Chat"}
                  >
                    {thread.title || "New Chat"}
                  </span>
                  
                  <div className="flex items-center opacity-0 group-hover/thread:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); onStartEditing(thread.id, thread.title || "New Chat"); }}
                      className="w-6 h-6 rounded-md hover:bg-[#00E5B0]/20 hover:text-[#00E5B0] text-white/40 transition-all shrink-0 ml-1"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => onDeleteThread(e, thread.id)}
                      className="w-6 h-6 rounded-md hover:bg-[#FF2A2A]/20 hover:text-[#FF2A2A] text-white/40 transition-all shrink-0 ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
