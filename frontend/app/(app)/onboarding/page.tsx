"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, SkipForward, Home, LogIn, Target, Zap, BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { SpiderWebBackground } from "@/components/ui/spiderweb-background";
import { Typewriter } from "@/components/ui/typewriter";

const GOALS = [
  { id: "interview_prep", label: "Interview Prep", icon: <Target size={24} />, desc: "Crack FAANG-level interviews" },
  { id: "competitive_programming", label: "Competitive Programming", icon: <Zap size={24} />, desc: "Compete and rank globally" },
  { id: "learning_dsa", label: "Learning DSA", icon: <BookOpen size={24} />, desc: "Master data structures & algorithms" },
  { id: "exploring", label: "Just Exploring", icon: <Search size={24} />, desc: "Curious about what Aivon offers" },
];

type Phase = "username" | "goals";

export default function OnboardingPage() {
  const [phase, setPhase] = useState<Phase>("username");
  const [username, setUsername] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const toggleGoal = (id: string) =>
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );

  const handleSkip = () => {
    router.push("/dashboard");
  };

  const handleUsernameSubmit = async () => {
    if (!username.trim() || username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    setPhase("goals");
    setError("");
  };

  const handleGoalsSubmit = async () => {
    if (selectedGoals.length === 0) {
      setError("Select at least one goal");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("aivon_token");
      await fetch("/api/auth/complete-onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ username, goals: selectedGoals }),
      });
      router.push("/dashboard");
    } catch {
      setError("Failed to save preferences");
      setLoading(false);
    }
  };

  const pageVariants = {
    initial: { opacity: 0, scale: 0.98, filter: "blur(10px)" },
    animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, scale: 1.02, filter: "blur(10px)" }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center font-geist-mono relative overflow-hidden text-white w-full">
      
      {/* 3D Cyber-Spider Background */}
      

      <div className="absolute top-8 left-6 md:left-12 flex items-center gap-6 z-50">
        <Link 
          href="/"
          className="text-[var(--text-secondary)] hover:text-[#00E5B0] text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 group"
        >
          <span className="opacity-50 group-hover:-translate-x-1 transition-transform">[</span>
          <Home size={12} className="group-hover:text-[#00E5B0] transition-colors" /> RETURN TO HOME
          <span className="opacity-50 group-hover:translate-x-1 transition-transform">]</span>
        </Link>
        <Link 
          href="/sign-in"
          className="text-[var(--text-secondary)] hover:text-[#00E5B0] text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 group"
        >
          <span className="opacity-50 group-hover:-translate-x-1 transition-transform">[</span>
          <LogIn size={12} className="group-hover:text-[#00E5B0] transition-colors" /> SIGN IN
          <span className="opacity-50 group-hover:translate-x-1 transition-transform">]</span>
        </Link>
      </div>

      <button 
        onClick={handleSkip}
        className="absolute top-8 right-6 md:right-12 text-[var(--text-secondary)] border-none text-xs font-bold cursor-pointer tracking-widest uppercase transition-colors hover:text-white z-50 flex items-center gap-2 group"
      >
        SKIP SETUP <SkipForward size={12} className="group-hover:translate-x-1 group-hover:text-white transition-all" />
      </button>

      <div className="relative z-10 w-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] px-4" style={{ maxWidth: phase === "goals" ? 720 : 500 }}>
        
        {/* Glow behind terminal */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#00E5B0]/5 blur-[120px] pointer-events-none rounded-full" />

        {/* Calibration Terminal */}
        <div className="p-8 md:p-12 relative z-10 bg-[#060D10]/80 backdrop-blur-lg border border-white/5 shadow-sm rounded-none">
          
          {/* Decorative Corner Cuts (Visual Only via Borders) */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00E5B0]" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00E5B0]" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00E5B0]" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00E5B0]" />

          {/* Progress Bar */}
          <div className="flex gap-2 mb-10 h-0.5 w-full bg-[#0F1E38]/50 overflow-hidden relative">
             <div className="absolute top-0 left-0 h-full w-1/2 bg-[#00E5B0] shadow-[0_0_10px_#00E5B0] transition-all duration-700" style={{ width: phase === "goals" ? '100%' : '50%' }} />
          </div>

          <AnimatePresence mode="wait">
            {phase === "username" && (
              <motion.div key="username" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4, ease: "circOut" }}>
                <div className="text-center mb-10">
                  <div className="w-12 h-12 bg-[#00E5B0]/10 border border-white/5 rounded-xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-sm text-[#00E5B0]">
                    <Target size={24} />
                  </div>
                  <Typewriter 
                    text="Create Username" 
                    className="text-2xl md:text-3xl font-space-grotesk font-bold tracking-tight text-white mb-2 justify-center"
                    speed={60}
                  />
                  <Typewriter 
                    text="Choose your display name for leaderboards" 
                    className="text-[var(--text-secondary)] text-sm font-geist-mono justify-center"
                    delay={1000}
                  />
                </div>

                <div className="mb-8">
                  <label htmlFor="callsign" className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest mb-2 block">Username</label>
                  <div className="relative group w-full">
                    <input
                      id="callsign"
                      type="text"
                      placeholder="neural_coder"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      maxLength={20}
                      className="bg-[#05070A]/50 border border-white/5 outline-none text-white w-full px-4 py-3 text-sm font-geist-mono focus:border-[#00E5B0] focus:shadow-sm transition-all placeholder:text-[var(--text-muted)]"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  onClick={handleUsernameSubmit}
                  className="w-full mt-6 py-4 bg-[#00E5B0]/10 border border-white/5 text-[#00E5B0] text-xs font-bold uppercase tracking-widest transition-all duration-300 hover:bg-[#00E5B0] hover:text-black hover:shadow-sm flex items-center justify-center gap-3 group/btn"
                >
                  Continue <ArrowRight size={14} className="group-hover/btn:translate-x-2 transition-transform" />
                </button>
              </motion.div>
            )}

            {phase === "goals" && (
              <motion.div key="goals" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4, ease: "circOut" }}>
                <div className="text-center mb-10">
                  <div className="w-12 h-12 bg-[#00E5B0]/10 border border-white/5 rounded-xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-sm text-[#00E5B0]">
                    <Target size={24} />
                  </div>
                  <Typewriter 
                    text="Select your goals" 
                    className="text-2xl md:text-3xl font-space-grotesk font-bold tracking-tight text-white mb-2 justify-center"
                    speed={60}
                  />
                  <Typewriter 
                    text="What do you want to achieve?" 
                    className="text-[var(--text-secondary)] text-sm font-geist-mono justify-center"
                    delay={1000}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {GOALS.map((goal, idx) => {
                    const isSelected = selectedGoals.includes(goal.id);
                    return (
                      <motion.button
                        key={goal.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => toggleGoal(goal.id)}
                        className={`text-left p-5 border transition-all duration-300 group/goal relative overflow-hidden flex flex-col items-start ${
                          isSelected 
                            ? "bg-[#00E5B0]/10 border-[#00E5B0] shadow-sm" 
                            : "bg-[#05070A]/50 border border-white/5 hover:border-white/5"
                        }`}
                      >
                        {/* HUD Scanning Line Effect for selected */}
                        {isSelected && (
                          <div className="absolute top-0 left-0 w-full h-[1px] bg-[#00E5B0] shadow-[0_0_5px_#00E5B0] animate-[scan_2s_ease-in-out_infinite]" />
                        )}

                        <div className={`mb-4 transition-colors ${isSelected ? "text-[#00E5B0]" : "text-[var(--text-secondary)] group-hover/goal:text-[#00E5B0]"}`}>
                          {goal.icon}
                        </div>
                        <div className={`font-bold text-sm tracking-wide uppercase mb-1 transition-colors ${isSelected ? "text-white" : "text-[var(--text-primary)]"}`}>
                          {goal.label}
                        </div>
                        <div className={`text-xs ${isSelected ? "text-[#00E5B0]/70" : "text-[var(--text-muted)]"}`}>
                          {goal.desc}
                        </div>

                        {/* HUD Target Acquired Watermark */}
                        {isSelected && (
                          <div className="absolute top-3 right-3 text-[10px] font-bold text-[#00E5B0] border border-white/5 px-2 py-0.5 bg-[#00E5B0]/10 uppercase tracking-widest">
                            Selected
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <style jsx>{`
                  @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                  }
                `}</style>

                <button
                  onClick={handleGoalsSubmit}
                  disabled={selectedGoals.length === 0 || loading}
                  className={`w-full mt-10 py-4 font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 group/btn ${
                    selectedGoals.length > 0 && !loading 
                      ? "bg-[#00E5B0]/10 border border-white/5 text-[#00E5B0] cursor-pointer hover:bg-[#00E5B0] hover:text-black hover:shadow-sm" 
                      : "bg-[#05070A]/50 border border-white/5 text-[#00E5B0] cursor-not-allowed opacity-50"
                  }`}
                >
                  {loading ? "Saving..." : "Complete Setup"} 
                  {!loading && <ArrowRight size={14} className="group-hover/btn:translate-x-2 transition-transform" />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -bottom-16 left-0 w-full p-3 bg-[#FF2A2A]/10 border border-[#FF2A2A]/40 text-[#FF2A2A] text-xs text-center shadow-[0_0_15px_rgba(255,42,42,0.15)] flex items-center justify-center gap-2"
            >
              {error}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
