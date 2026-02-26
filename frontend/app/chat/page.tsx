"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Send, Bot, User, Trash2, Cpu, Activity, ShieldAlert, Sparkles, PanelLeftClose, PanelLeftOpen, Copy, RotateCcw, ThumbsUp, ThumbsDown, Check, Download, Settings2, Edit2, X } from "lucide-react";
import { saveAs } from "file-saver";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Types
type Message = {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  isThinking?: boolean;
};

// Config
const API_URL = process.env.NEXT_PUBLIC_CHATBOT_API_URL || "http://localhost:8000";

export default function ChatPage() {
  const { data: session } = useSession();
  const [threads, setThreads] = useState<string[]>([]);
  const [activeThread, setActiveThread] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("nexus-core");
  
  // New UI Features
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [deletedThreads, setDeletedThreads] = useState<string[]>([]);
  const [threadTitles, setThreadTitles] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const [editingThread, setEditingThread] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");

  // Initialize and load threads
  useEffect(() => {
    // Load local storage data
    const savedDeleted = JSON.parse(localStorage.getItem("aivon_deleted_threads") || "[]");
    const savedTitles = JSON.parse(localStorage.getItem("aivon_thread_titles") || "{}");
    setDeletedThreads(savedDeleted);
    setThreadTitles(savedTitles);

    fetchThreads(savedDeleted);
    
    // Generate a new thread ID if none exists
    const newThreadId = crypto.randomUUID();
    setActiveThread(newThreadId);
    setThreads(prev => {
        if (!prev.includes(newThreadId) && !savedDeleted.includes(newThreadId)) {
            return [newThreadId, ...prev];
        }
        return prev;
    });
  }, []);

  // Scroll to bottom when messages change, unless user has scrolled up
  useEffect(() => {
    if (!userScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTool, userScrolled]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Smart auto-scroll: If user scrolled up more than 120px from bottom, pause auto-scroll
    if (scrollHeight - scrollTop - clientHeight > 120) {
      setUserScrolled(true);
    } else {
      setUserScrolled(false);
    }
  };

  const copyToClipboard = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  const regenerateResponse = async () => {
    if (isLoading || messages.length < 2) return;
    
    // Find last user message
    const lastUserMsgIndex = messages.findLastIndex(m => m.role === "user");
    if (lastUserMsgIndex === -1) return;
    
    const lastUserMsg = messages[lastUserMsgIndex].content;
    
    // Remove all messages after the last user message
    setMessages(messages.slice(0, lastUserMsgIndex + 1));
    
    // Trigger resend
    setInput(lastUserMsg);
    setTimeout(() => {
      // Temporary hack to click send, refactor abstract sendMessage later
      const sendBtn = document.getElementById("transmit-btn");
      if (sendBtn) sendBtn.click();
    }, 100);
  };

  const fetchThreads = async (deleted: string[]) => {
    try {
      const res = await fetch(`${API_URL}/threads`);
      if (res.ok) {
        const data = await res.json();
        if (data.threads && data.threads.length > 0) {
          const backendTitles: Record<string, string> = {};
          const threadIds = data.threads.map((t: { id: string, title?: string }) => {
             if (t.title) backendTitles[t.id] = t.title;
             return t.id;
          });
          
          setThreadTitles(prev => {
              const merged = {...prev, ...backendTitles};
              localStorage.setItem("aivon_thread_titles", JSON.stringify(merged));
              return merged;
          });

          setThreads(prev => {
             const combined = [...new Set([...prev, ...threadIds])];
             return combined.filter(t => !deleted.includes(t));
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch threads", e);
    }
  };

  const handleSaveTitle = async (threadId: string) => {
      if (!editTitleValue.trim()) {
          setEditingThread(null);
          return;
      }
      
      try {
          // Update Optimistically
          const newTitles = { ...threadTitles, [threadId]: editTitleValue };
          setThreadTitles(newTitles);
          localStorage.setItem("aivon_thread_titles", JSON.stringify(newTitles));
          setEditingThread(null);
          
          // API Call
          await fetch(`${API_URL}/threads/${threadId}/title`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: editTitleValue })
          });
      } catch (e) {
          console.error("Failed to save thread title", e);
      }
  };

  const loadHistory = async (threadId: string) => {
    setActiveThread(threadId);
    try {
      const res = await fetch(`${API_URL}/history/${threadId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const createNewChat = () => {
    const newThreadId = crypto.randomUUID();
    setActiveThread(newThreadId);
    setMessages([]);
    setThreads(prev => [newThreadId, ...prev]);
  };

  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();

    // Call backend to delete
    try {
      await fetch(`${API_URL}/threads/${threadId}`, { method: 'DELETE' });
    } catch (e) {
      console.error("Failed to delete thread on backend", e);
    }

    const updatedDeleted = [...deletedThreads, threadId];
    setDeletedThreads(updatedDeleted);
    localStorage.setItem("aivon_deleted_threads", JSON.stringify(updatedDeleted));
    
    setThreads(prev => prev.filter(t => t !== threadId));
    
    if (activeThread === threadId) {
      createNewChat();
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput("");
    
    // Generate Thread Title if it's the first message
    if (messages.length === 0) {
        if (!threadTitles[activeThread]) {
            const newTitles = { ...threadTitles, [activeThread]: "New Chat" };
            setThreadTitles(newTitles);
            localStorage.setItem("aivon_thread_titles", JSON.stringify(newTitles));
        }
        
        // Poll backend for dynamic title generated by AI/Deterministic Rules
        setTimeout(() => {
            fetchThreads(deletedThreads);
        }, 4000);
    }

    // Add user message to UI immediately
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    
    // Optimistic UI: Inject empty 'thinking' message instantly
    setMessages((prev) => [...prev, { role: "assistant", content: "", isThinking: true, isStreaming: true }]);
    
    setIsLoading(true);
    setActiveTool(null);

    // Initialise AbortController
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            message: userMsg, 
            thread_id: activeThread,
            model: selectedModel
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantContent = "";
      
      // Token Buffering System 
      let tokenBuffer = "";
      let isFirstToken = true;
      let flushTimer: NodeJS.Timeout | null = null;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === "tool_start") {
                  setActiveTool(data.tool);
                } else if (data.type === "message_chunk") {
                  setActiveTool(null); // Clear tool status when text arrives
                  
                  // Transition from Thinking -> Streaming
                  if (isFirstToken) {
                     isFirstToken = false;
                  }
                  
                  tokenBuffer += data.content;
                  assistantContent += data.content;
                  
                  // Micro-smoothing token flush (every 25ms)
                  if (!flushTimer) {
                      flushTimer = setTimeout(() => {
                          setMessages((prev) => {
                            const newMessages = [...prev];
                            newMessages[newMessages.length - 1] = { 
                                role: "assistant", 
                                content: assistantContent,
                                isStreaming: true,
                                isThinking: false // Thinking is over
                            };
                            return newMessages;
                          });
                          tokenBuffer = "";
                          flushTimer = null;
                      }, 25);
                  }
                  
                } else if (data.type === "done") {
                  // Finalize the message and clear any pending buffer
                  if (flushTimer) clearTimeout(flushTimer);
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { 
                        role: "assistant", 
                        content: assistantContent,
                        isStreaming: false,
                        isThinking: false
                    };
                    return newMessages;
                  });
                } else if (data.type === "error") {
                     if (flushTimer) clearTimeout(flushTimer);
                     setMessages((prev) => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1] = { 
                            role: "assistant", 
                            content: assistantContent + "\n\n**[System Error: " + data.error + "]**",
                            isStreaming: false,
                            isThinking: false
                        };
                        return newMessages;
                    });
                }
              } catch (e) {
                console.error("Failed to parse stream chunk", e, line);
              }
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].isStreaming = false;
          newMessages[newMessages.length - 1].isThinking = false;
          newMessages[newMessages.length - 1].content += "\n\n<span class=\"font-space-grotesk tracking-widest font-bold text-[10px] text-transparent bg-clip-text bg-[linear-gradient(90deg,#FF2A2A_0%,#FF6B6B_100%)]\">[ CONNECTION_TERMINATED ]</span>";
          return newMessages;
        });
      } else {
        console.error("Chat error:", error);
      }
    } finally {
      setIsLoading(false);
      setActiveTool(null);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const exportChat = (format: "md" | "txt" | "json") => {
    if (messages.length === 0) return;
    
    const title = threadTitles[activeThread] || "Aivon_Session";
    let content = "";
    let mimeType = "";
    let ext = "";

    if (format === "md") {
        content += `# Aivon Nexus Archive: ${title}\n\n`;
        content += `*Session ID: ${activeThread}*\n\n---\n\n`;
        messages.forEach((msg) => {
            content += `### ${msg.role === "user" ? "Operative Query" : "Nexus AI Response"}\n`;
            content += `${msg.content}\n\n---\n\n`;
        });
        mimeType = "text/markdown;charset=utf-8";
        ext = "md";
    } else if (format === "txt") {
        content += `${title.toUpperCase()}\n`;
        content += `Session: ${activeThread}\n====================\n\n`;
        messages.forEach((msg) => {
            content += `[${msg.role === "user" ? "OPERATIVE" : "NEXUS AI"}]:\n${msg.content}\n\n`;
        });
        mimeType = "text/plain;charset=utf-8";
        ext = "txt";
    } else if (format === "json") {
        const payload = {
            id: activeThread,
            title: title,
            exportedAt: new Date().toISOString(),
            messages: messages.map(m => ({ role: m.role, content: m.content }))
        };
        content = JSON.stringify(payload, null, 2);
        mimeType = "application/json;charset=utf-8";
        ext = "json";
    }
    
    const blob = new Blob([content], { type: mimeType });
    saveAs(blob, `Aivon_${title.replace(/\s+/g, "_")}.${ext}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[100dvh] bg-transparent pt-[120px] pb-6 px-4 md:px-8 gap-6 relative overflow-hidden font-geist-mono w-full max-w-[1500px] mx-auto z-10 transition-all">
      
      {/* Sliding Sidebar - Floating, No Card Wrapper */}
      <div 
        className={`flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col z-20 ${
            isSidebarOpen ? "w-72 lg:w-80 opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-[200px] pointer-events-none hidden md:flex"
        } ${!isSidebarOpen && "hidden"}`}
      >
        <div className="h-full flex flex-col relative group">
            
            {/* Header Area */}
            <div className="flex items-center gap-3 mb-8 relative z-10 w-full justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#00C2FF]/10 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,176,0.2)]">
                        <Cpu className="text-[#00C2FF] w-4 h-4" />
                    </div>
                    <h2 className="font-space-grotesk font-bold text-[15px] text-white tracking-widest uppercase text-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Nexus AI</h2>
                </div>
                <Button variant="ghost" size="icon" className="text-[#00C2FF] hover:text-[#00C2FF] hover:bg-white/5 transition-colors" onClick={() => setIsSidebarOpen(false)}>
                    <PanelLeftClose className="w-5 h-5" />
                </Button>
            </div>
            
            {/* New Chat Button */}
            <Button 
                onClick={createNewChat}
                className="w-full bg-[#00C2FF]/10 hover:bg-[#00C2FF] text-[#00C2FF] hover:text-[#05070A] border border-[#00C2FF]/30 hover:shadow-[0_0_20px_rgba(0,229,176,0.4)] mb-8 justify-start font-mono transition-all duration-300 relative z-10 backdrop-blur-md rounded-xl h-12"
            >
            <Sparkles className="w-4 h-4 mr-3" />
            [ INIT_NEW_UPLINK ]
            </Button>
            
            {/* Thread List */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 relative z-10">
                <h3 className="text-[10px] font-bold text-[#00C2FF]/70 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 px-2">
                    <div className="w-1 h-3 bg-[#00C2FF] shadow-[0_0_8px_rgba(0,194,255,0.5)]" /> Memory Archives
                </h3>
                {threads.map((thread) => (
                    <div
                        key={thread}
                        onClick={() => { if(editingThread !== thread) { loadHistory(thread); if(window.innerWidth < 768) setIsSidebarOpen(false); } }}
                        className={`w-full text-left px-4 py-3.5 rounded-xl text-xs font-mono transition-all group/thread flex items-center justify-between cursor-pointer backdrop-blur-md border ${
                            activeThread === thread 
                            ? "bg-[#00C2FF]/10 text-[#00C2FF] border-[#00C2FF]/50 shadow-[0_0_20px_rgba(0,229,176,0.15)]" 
                            : "bg-[#0A0F14]/40 text-[#00C2FF]/70 border-white/5 hover:bg-[#00C2FF]/10 hover:text-[#00C2FF] hover:border-[#00C2FF]/30"
                        }`}
                    >
                        {editingThread === thread ? (
                            <div className="flex items-center gap-2 w-full pr-2">
                                <input
                                    autoFocus
                                    className="flex-1 bg-transparent border-b border-[#00C2FF] text-[#00C2FF] outline-none w-full"
                                    value={editTitleValue}
                                    onChange={(e) => setEditTitleValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveTitle(thread);
                                        if (e.key === "Escape") setEditingThread(null);
                                    }}
                                />
                                <Button size="icon" variant="ghost" className="w-5 h-5 hover:bg-transparent" onClick={(e) => { e.stopPropagation(); handleSaveTitle(thread); }}>
                                    <Check className="w-3 h-3 text-[#00E5B0]" />
                                </Button>
                                <Button size="icon" variant="ghost" className="w-5 h-5 hover:bg-transparent" onClick={(e) => { e.stopPropagation(); setEditingThread(null); }}>
                                    <X className="w-3 h-3 text-[#FF2A2A]" />
                                </Button>
                            </div>
                        ) : (
                            <>
                                <span className="truncate flex-1 tracking-wider leading-relaxed">
                                    {threadTitles[thread] || (messages.length === 0 && activeThread === thread ? "New Chat" : thread.slice(0, 13) + "...")}
                                </span>
                                
                                <div className="flex items-center opacity-0 group-hover/thread:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); setEditingThread(thread); setEditTitleValue(threadTitles[thread] || "New Chat"); }}
                                        className="w-6 h-6 rounded-md hover:bg-[#00E5B0]/20 hover:text-[#00E5B0] text-white/40 transition-all shrink-0 ml-1"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => handleDeleteThread(e, thread)}
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

      {/* Main Chat Area - Floating */}
      <div className="flex-1 flex flex-col relative z-10 w-full h-full min-w-0 pb-2">
        
        {/* Header - Floating Top Row */}
        <div className="pb-4 flex items-center justify-between relative z-20 shrink-0">
            <div className="flex items-center gap-3 md:gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className={`text-[#00C2FF] hover:text-[#00C2FF] hover:bg-white/5 transition-all ${isSidebarOpen ? "hidden" : "flex"}`}
                >
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
                {/* Model Selector */}
                <select 
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="hidden md:flex text-[9px] md:text-[10px] text-[#00E5B0] font-mono bg-[#00E5B0]/10 px-3 py-1.5 rounded-full border border-[#00E5B0]/30 outline-none cursor-pointer tracking-widest uppercase appearance-none text-center"
                >
                    <option value="nexus-core">Model: CORE</option>
                    <option value="nexus-coder">Model: CODER</option>
                </select>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="sm"
                            className="hidden lg:flex text-[9px] md:text-[10px] text-[#00C2FF] font-mono bg-[#00C2FF]/10 px-4 py-1.5 h-auto rounded-full border border-[#00C2FF]/30 hover:bg-[#00C2FF]/20 hover:text-[#00C2FF] tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(0,194,255,0.15)] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        >
                            <Download className="w-3 h-3 mr-2" /> EXPORT ▼
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                        align="end" 
                        className="w-48 bg-[#0A0F14]/95 border border-[#00C2FF]/30 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,194,255,0.15)] rounded-xl p-2 font-mono"
                    >
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
                            const title = threadTitles[activeThread] || "Aivon Session";
                            let txt = `[ ${title.toUpperCase()} ]\n\n`;
                            messages.forEach((msg) => {
                                txt += `${msg.role === "user" ? "Operative" : "Nexus"}: ${msg.content}\n\n`;
                            });
                            copyToClipboard(txt, 9999);
                        }} className="text-xs text-[#00C2FF]/80 hover:text-[#0E1520] hover:bg-[#00C2FF] focus:bg-[#00C2FF] focus:text-[#0E1520] font-bold cursor-pointer rounded-lg px-3 py-2.5 outline-none transition-all w-full flex items-center gap-2 tracking-widest">
                            <Copy className="w-3 h-3" /> Copy to Clipboard
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Session Pill */}
                <div className="text-[10px] text-[#00C2FF] font-mono hidden md:flex items-center gap-2 bg-[#00C2FF]/10 px-3 py-1.5 rounded-full border border-[#00C2FF]/30 backdrop-blur-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00C2FF] animate-pulse shadow-[0_0_5px_#00E5B0]" />
                    SESSION: {activeThread.slice(0,8)}
                </div>
            </div>
        </div>

        {/* Messages */}
        <div 
            className="flex-1 overflow-y-auto pt-2 pb-8 space-y-6 md:space-y-8 custom-scrollbar relative w-full xl:max-w-4xl xl:mx-auto"
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
                    <div key={idx} className={`flex gap-3 md:gap-5 relative z-20 ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 border shadow-sm hidden sm:flex backdrop-blur-md ${
                            msg.role === "user" 
                            ? "bg-[#00E5B0]/10 border-[#00E5B0]/30 text-[#00E5B0] shadow-[0_0_15px_rgba(0,229,176,0.2)]" 
                            : "bg-[#00C2FF]/10 border-[#00C2FF]/30 text-[#00C2FF] shadow-[0_0_15px_rgba(0,229,176,0.2)]"
                        }`}>
                            {msg.role === "user" ? <User className="w-4 h-4 md:w-5 md:h-5" /> : <Bot className="w-4 h-4 md:w-5 md:h-5" />}
                        </div>
                        
                        <div className={`p-5 md:p-6 rounded-2xl max-w-[90%] sm:max-w-[85%] md:max-w-[80%] break-words min-w-0 backdrop-blur-xl border ${
                             msg.role === "user" 
                             ? "bg-[#0A0F14]/60 border-[#00E5B0]/10 text-white rounded-tr-sm shadow-[0_4px_30px_rgba(0,229,176,0.05)]" 
                             : "bg-[#0A0F14]/80 border-[#00C2FF]/10 text-[#00C2FF]/90 rounded-tl-sm shadow-[0_4px_30px_rgba(0,229,176,0.05)]"
                         }`}>
                             <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-bold mb-3 md:mb-4 flex items-center gap-2">
                               {msg.role === "user" ? (
                                 <>
                                   <span className="w-1.5 h-1.5 rounded-[1px] bg-[#00E5B0] shadow-[0_0_8px_#00E5B0]" />
                                   <span className="text-[#00E5B0]/80">OPERATIVE_QUERY</span>
                                 </>
                               ) : (
                                 <>
                                   <span className="w-1.5 h-1.5 rounded-[1px] bg-[#00C2FF] shadow-[0_0_8px_#00E5B0] animate-pulse" />
                                   <span className="text-[#00C2FF]/80">NEXUS_RESPONSE</span>
                                 </>
                               )}
                            </div>
                            <div className={`whitespace-pre-wrap text-[13px] leading-relaxed font-geist-mono overflow-hidden ${msg.role === "user" ? "" : "prose prose-invert prose-p:text-white/80 prose-strong:text-[#00C2FF] prose-code:text-[#00C2FF] prose-code:bg-[#05070A]/50 prose-code:border prose-code:border-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-pre:bg-[#05070A]/80 prose-pre:border prose-pre:border-white/5 prose-pre:shadow-inner prose-a:text-[#00C2FF] prose-a:underline prose-a:underline-offset-4 prose-pre:max-w-full prose-pre:overflow-x-auto"}`}>
                                {msg.isThinking ? (
                                    <span className="inline-flex gap-1 items-center h-6">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#00C2FF] animate-bounce" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#00C2FF] animate-bounce delay-150" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#00C2FF] animate-bounce delay-300" />
                                    </span>
                                ) : (
                                    <>
                                        {msg.content}
                                        {msg.isStreaming && !activeTool && <span className="inline-block w-2.5 h-4 ml-1.5 bg-[#00C2FF] animate-pulse align-middle shadow-[0_0_8px_#00C2FF]" />}
                                    </>
                                )}
                            </div>
                            
                            {/* Message Actions (Copy, Regenerate, Thumbs) */}
                            {msg.role === "assistant" && !msg.isStreaming && (
                                <div className="mt-4 pt-3 border-t border-[#00C2FF]/10 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-1">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 px-2.5 text-[#00C2FF]/50 hover:text-[#00C2FF] hover:bg-[#00C2FF]/10 font-mono text-[9px] tracking-widest uppercase transition-all"
                                            onClick={() => copyToClipboard(msg.content, idx)}
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
                                        {idx === messages.length - 1 && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={regenerateResponse}
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
                ))
            )}
            
            {/* Tool Execution Indicator */}
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

        {/* Input Area - Floating Pill */}
        <div className="relative z-20 shrink-0 w-full xl:max-w-4xl mx-auto mt-2">
            
            {/* Stop Generation Button Container */}
            <div className={`absolute -top-14 left-1/2 -translate-x-1/2 transition-all duration-300 ${isLoading ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
                <Button 
                    onClick={stopGeneration}
                    variant="outline"
                    className="h-9 px-4 rounded-full bg-[#0A0F14]/90 backdrop-blur-md border border-[#FF2A2A]/40 text-[#FF2A2A] hover:bg-[#FF2A2A]/10 hover:text-[#FF2A2A] hover:border-[#FF2A2A] font-space-grotesk font-bold uppercase tracking-widest text-[10px] shadow-[0_0_15px_rgba(255,42,42,0.15)] flex items-center gap-2 group"
                >
                    <div className="w-2.5 h-2.5 bg-[#FF2A2A] rounded-[1px] group-hover:shadow-[0_0_8px_#FF2A2A] transition-all" />
                    STOP GENERATION
                </Button>
            </div>

            <div className="relative flex items-center gap-2 md:gap-3 bg-[#060D10]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-2 focus-within:border-[#00C2FF]/50 focus-within:shadow-[0_0_30px_rgba(0,194,255,0.15)] transition-all duration-300 overflow-hidden w-full">
                <span className="text-[#00C2FF] pl-4 md:pl-5 font-mono text-[15px] font-bold self-center animate-pulse hidden sm:block">&gt;</span>
                <Textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="ENTER COMMAND OR QUERY..."
                    className="min-h-[44px] md:min-h-[50px] max-h-[150px] md:max-h-[200px] border-0 focus-visible:ring-0 bg-transparent resize-none py-3 md:py-3.5 text-sm font-geist-mono text-white placeholder:text-white/30 placeholder:tracking-[0.15em] w-full"
                    disabled={isLoading}
                />
                <Button 
                    id="transmit-btn"
                    onClick={sendMessage}
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
      </div>
      
    </div>
  );
}
