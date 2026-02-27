"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { chatWithAI, listChatThreads, getChatThread, deleteChatThread, clearChatThreads, updateThreadTitle } from "@/lib/api";
import { Bot, PanelLeftOpen, Activity, ShieldAlert, Cpu, Download, Copy, Settings2 } from "lucide-react";
import { saveAs } from "file-saver";
import { useLiveSocket } from "@/hooks/useLiveSocket";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Message, Thread } from "./types";
import { ChatSidebar } from "./ChatSidebar";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

export default function ChatPage() {
  const { data: session } = useSession();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("nexus-core");
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const [editingThread, setEditingThread] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [platformActivity, setPlatformActivity] = useState(0);

  const { listen } = useLiveSocket(["marketing_stats"]);

  useEffect(() => {
    const unlisten = listen("system_activity", (payload: any) => {
      if (payload?.type === "submission_solved") setPlatformActivity(prev => prev + 1);
    });
    return unlisten;
  }, [listen]);

  useEffect(() => { refreshThreads(); }, []);

  useEffect(() => {
    if (!userScrolled) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTool, userScrolled]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const refreshThreads = async () => {
    try { const { threads: data } = await listChatThreads("general_chat"); setThreads(data); }
    catch (e) { console.error("Failed to load threads", e); }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setUserScrolled(scrollHeight - scrollTop - clientHeight > 120);
  };

  const copyToClipboard = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) { console.error("Failed to copy text", err); }
  };

  const regenerateResponse = async () => {
    if (isLoading || messages.length < 2) return;
    const lastUserMsgIndex = messages.findLastIndex(m => m.role === "user");
    if (lastUserMsgIndex === -1) return;
    const lastUserMsg = messages[lastUserMsgIndex].content;
    setMessages(messages.slice(0, lastUserMsgIndex + 1));
    setInput(lastUserMsg);
    requestAnimationFrame(() => {
      const sendBtn = document.getElementById("transmit-btn");
      if (sendBtn) sendBtn.click();
    });
  };

  const loadHistory = async (threadId: string) => {
    setActiveThread(threadId);
    try { const { thread } = await getChatThread(threadId); setMessages(thread.messages as Message[]); }
    catch (e) { console.error("Failed to fetch thread history", e); }
  };

  const handleSaveTitle = async (threadId: string) => {
    if (!editTitleValue.trim()) { setEditingThread(null); return; }
    try {
      await updateThreadTitle(threadId, editTitleValue.trim());
      setThreads(prev => prev.map(t => t.id === threadId ? { ...t, title: editTitleValue.trim() } : t));
      setEditingThread(null);
    } catch (e: any) { console.error("Failed to save thread title", e); setEditingThread(null); }
  };

  const createNewChat = () => { setActiveThread(""); setMessages([]); };

  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    try {
      await deleteChatThread(threadId);
      refreshThreads();
      if (activeThread === threadId) createNewChat();
    } catch (e) { console.error("Failed to delete thread", e); }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setMessages(prev => [...prev, { role: "assistant", content: "", isThinking: true, isStreaming: false }]);
    setIsLoading(true);
    setActiveTool(null);
    abortControllerRef.current = new AbortController();

    try {
      const newMessagesLocal = [...messages, { role: "user" as const, content: userMsg }];
      const data = await chatWithAI("general_chat", newMessagesLocal, undefined, undefined, abortControllerRef.current.signal, activeThread || undefined);
      const assistantReply = data.reply || "I encountered an error formulating a reply.";
      setMessages([...newMessagesLocal, { role: "assistant" as const, content: assistantReply }]);
      if (!activeThread && data.threadId) {
        setActiveThread(data.threadId);
        setTimeout(() => refreshThreads(), 1500); 
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg?.role === "assistant") { lastMsg.isStreaming = false; lastMsg.isThinking = false; if (!lastMsg.content.trim()) lastMsg.content = "Generation was stopped."; }
          return newMessages;
        });
      } else {
        const errMsg = error instanceof Error ? error.message : "An unexpected error occurred.";
        console.error("Chat error:", error);
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg?.role === "assistant") { lastMsg.isStreaming = false; lastMsg.isThinking = false; lastMsg.content = `⚠️ ${errMsg}`; }
          return newMessages;
        });
      }
    } finally {
      setIsLoading(false);
      setActiveTool(null);
      abortControllerRef.current = null;
    }
  };

  const clearChat = async () => {
    if (!window.confirm("Are you sure you want to delete ALL chat archives? This operation is permanent.")) return;
    try { await clearChatThreads(); setThreads([]); setMessages([]); setActiveThread(""); }
    catch (e) { console.error("Failed to clear chat memory", e); }
  };

  const stopGeneration = () => { abortControllerRef.current?.abort(); };

  const exportChat = (format: "md" | "txt" | "json") => {
    if (messages.length === 0) return;
    const thread = threads.find(t => t.id === activeThread);
    const title = thread?.title || "Aivon_Session";
    let content = ""; let mimeType = ""; let ext = "";
    if (format === "md") {
      content += `# Aivon Nexus Archive: ${title}\n\n*Session ID: ${activeThread}*\n\n---\n\n`;
      messages.forEach(msg => { content += `### ${msg.role === "user" ? "Operative Query" : "Nexus AI Response"}\n${msg.content}\n\n---\n\n`; });
      mimeType = "text/markdown;charset=utf-8"; ext = "md";
    } else if (format === "txt") {
      content += `${title.toUpperCase()}\nSession: ${activeThread}\n====================\n\n`;
      messages.forEach(msg => { content += `[${msg.role === "user" ? "OPERATIVE" : "NEXUS AI"}]:\n${msg.content}\n\n`; });
      mimeType = "text/plain;charset=utf-8"; ext = "txt";
    } else if (format === "json") {
      content = JSON.stringify({ id: activeThread, title, exportedAt: new Date().toISOString(), messages: messages.map(m => ({ role: m.role, content: m.content })) }, null, 2);
      mimeType = "application/json;charset=utf-8"; ext = "json";
    }
    saveAs(new Blob([content], { type: mimeType }), `Aivon_${title.replace(/\s+/g, "_")}.${ext}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[100dvh] bg-transparent pt-[120px] pb-6 px-4 md:px-8 gap-6 relative overflow-hidden font-geist-mono w-full max-w-[1500px] mx-auto z-10 transition-all">
      
      <ChatSidebar
        threads={threads}
        activeThread={activeThread}
        isSidebarOpen={isSidebarOpen}
        editingThread={editingThread}
        editTitleValue={editTitleValue}
        onToggleSidebar={setIsSidebarOpen}
        onNewChat={createNewChat}
        onLoadHistory={loadHistory}
        onDeleteThread={handleDeleteThread}
        onClearAll={clearChat}
        onStartEditing={(id, title) => { setEditingThread(id); setEditTitleValue(title); }}
        onEditTitleChange={setEditTitleValue}
        onSaveTitle={handleSaveTitle}
        onCancelEditing={() => setEditingThread(null)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10 w-full h-full min-w-0 pb-2">
        
        {/* Header */}
        <div className="pb-4 flex items-center justify-between relative z-20 shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`text-[#00C2FF] hover:text-[#00C2FF] hover:bg-white/5 transition-all ${isSidebarOpen ? "hidden" : "flex"}`}>
              <PanelLeftOpen className="w-5 h-5" />
            </Button>
            <div className={`w-px h-6 bg-white/10 hidden md:block ${isSidebarOpen ? "hidden md:hidden" : ""}`} />
            <div className="relative group hidden sm:flex">
              <div className="w-10 h-10 rounded-full bg-[#00C2FF]/10 flex items-center justify-center border border-[#00C2FF]/30 shadow-[0_0_15px_rgba(0,229,176,0.2)]">
                <Bot className="w-5 h-5 text-[#00C2FF]" />
              </div>
            </div>
            <div>
              <h1 className="font-bold text-white text-[13px] md:text-[15px] tracking-[0.2em] uppercase font-space-grotesk truncate pr-2 flex items-center gap-2">
                <span className="text-[#00C2FF]">]</span> Oracle Interface v2 
              </h1>
              <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-[#00C2FF] font-mono tracking-widest uppercase mt-1">
                <Activity className="w-3 h-3 animate-pulse" />
                <span className="hidden sm:inline">NEURAL_LINK_ESTABLISHED</span>
                <span className="sm:hidden">ONLINE</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
              className="hidden md:flex text-[9px] md:text-[10px] text-[#00E5B0] font-mono bg-[#00E5B0]/10 px-3 py-1.5 rounded-full border border-[#00E5B0]/30 outline-none cursor-pointer tracking-widest uppercase appearance-none text-center">
              <option value="nexus-core">Model: CORE</option>
              <option value="nexus-coder">Model: CODER</option>
            </select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm"
                  className="hidden lg:flex text-[9px] md:text-[10px] text-[#00C2FF] font-mono bg-[#00C2FF]/10 px-4 py-1.5 h-auto rounded-full border border-[#00C2FF]/30 hover:bg-[#00C2FF]/20 hover:text-[#00C2FF] tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(0,194,255,0.15)] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                  <Download className="w-3 h-3 mr-2" /> EXPORT ▼
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-[#0A0F14]/95 border border-[#00C2FF]/30 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,194,255,0.15)] rounded-xl p-2 font-mono">
                <DropdownMenuItem onClick={() => exportChat('md')} className="text-xs text-[#00C2FF]/80 hover:text-[#00C2FF] hover:bg-[#00C2FF]/10 focus:bg-[#00C2FF]/10 focus:text-[#00C2FF] cursor-pointer rounded-lg px-3 py-2.5 outline-none transition-all w-full flex items-center gap-2 tracking-widest">
                  <span className="font-bold opacity-70">[.md]</span> Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportChat('txt')} className="text-xs text-[#00C2FF]/80 hover:text-[#00C2FF] hover:bg-[#00C2FF]/10 focus:bg-[#00C2FF]/10 focus:text-[#00C2FF] cursor-pointer rounded-lg px-3 py-2.5 outline-none transition-all w-full flex items-center gap-2 tracking-widest">
                  <span className="font-bold opacity-70">[.txt]</span> Plain Text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportChat('json')} className="text-xs text-[#00C2FF]/80 hover:text-[#00C2FF] hover:bg-[#00C2FF]/10 focus:bg-[#00C2FF]/10 focus:text-[#00C2FF] cursor-pointer rounded-lg px-3 py-2.5 outline-none transition-all w-full flex items-center gap-2 tracking-widest">
                  <span className="font-bold opacity-70">[.json]</span> Raw Data
                </DropdownMenuItem>
                <div className="h-[1px] w-full bg-[#00C2FF]/10 my-1" />
                <DropdownMenuItem onClick={() => {
                  const thread = threads.find(t => t.id === activeThread);
                  const title = thread?.title || "Aivon Session";
                  let txt = `[ ${title.toUpperCase()} ]\n\n`;
                  messages.forEach(msg => { txt += `${msg.role === "user" ? "Operative" : "Nexus"}: ${msg.content}\n\n`; });
                  copyToClipboard(txt, 9999);
                }} className="text-xs text-[#00C2FF]/80 hover:text-[#0E1520] hover:bg-[#00C2FF] focus:bg-[#00C2FF] focus:text-[#0E1520] font-bold cursor-pointer rounded-lg px-3 py-2.5 outline-none transition-all w-full flex items-center gap-2 tracking-widest">
                  <Copy className="w-3 h-3" /> Copy to Clipboard
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="text-[10px] text-[#00C2FF] font-mono hidden md:flex items-center gap-2 bg-[#00C2FF]/10 px-3 py-1.5 rounded-full border border-[#00C2FF]/30 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C2FF] animate-pulse shadow-[0_0_5px_#00E5B0]" />
              SESSION: {activeThread.slice(0,8)}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div 
          className={`flex-1 overflow-y-auto pt-2 pb-8 space-y-6 md:space-y-8 custom-scrollbar relative w-full transition-all duration-500 ${isSidebarOpen ? "xl:max-w-4xl xl:mx-auto" : "max-w-full lg:px-24 xl:px-40 mx-auto"}`}
          onScroll={handleScroll}
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center relative z-20 px-4">
              <div className="relative mb-8">
                <ShieldAlert className="w-20 h-20 text-[#00C2FF] drop-shadow-[0_0_20px_rgba(0,229,176,0.4)] animate-pulse relative z-10" />
              </div>
              <h2 className="text-xl md:text-3xl font-space-grotesk font-bold tracking-[0.2em] text-transparent bg-clip-text bg-[linear-gradient(90deg,#00E5B0_0%,#00C2FF_100%)] mb-4 uppercase text-center w-full">
                Aivon Global Nexus
              </h2>
              <p className="text-[10px] md:text-11px text-[#00C2FF]/70 max-w-sm md:max-w-lg font-mono tracking-[0.15em] leading-relaxed uppercase">
                Secure communication channel established. Await your directive: algorithmic analysis, system diagnostics, or code augmentation.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <ChatMessage
                key={idx}
                msg={msg}
                idx={idx}
                isLast={idx === messages.length - 1}
                copiedId={copiedId}
                activeTool={activeTool}
                onCopy={copyToClipboard}
                onRegenerate={regenerateResponse}
              />
            ))
          )}
          
          {activeTool && (
            <div className="flex gap-4 max-w-[90%] sm:max-w-[85%] mr-auto items-center text-[10px] md:text-xs font-mono uppercase tracking-[0.15em] relative z-20">
              <div className="w-8 h-8 flex items-center justify-center hidden sm:flex">
                <Cpu className="w-5 h-5 text-[#00C2FF] animate-pulse drop-shadow-[0_0_8px_#00C2FF]" />
              </div>
              <div className="flex items-center gap-3 md:gap-4 bg-[#00C2FF]/10 backdrop-blur-md border border-[#00C2FF]/30 px-5 py-3 rounded-xl text-white/70 shadow-[0_0_15px_rgba(0,194,255,0.1)] relative overflow-hidden group w-full sm:w-auto">
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-[#00C2FF] to-transparent animate-[scan_2s_ease-in-out_infinite]" />
                <div className="w-2 h-2 bg-[#00C2FF] rounded-full animate-ping shadow-[0_0_8px_#00C2FF] shrink-0" />
                <span className="truncate">Executing: <span className="text-[#00C2FF] font-bold">[{activeTool}]</span></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-4" />
        </div>

        <ChatInput
          input={input}
          isLoading={isLoading}
          isSidebarOpen={isSidebarOpen}
          onInputChange={setInput}
          onSend={sendMessage}
          onStop={stopGeneration}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
}
