"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { ArrowRight, SkipForward, Home, LogIn } from "lucide-react";
import Link from "next/link";

const GOALS = [
  { id: "interview_prep", label: "Interview Prep", icon: "🎯", desc: "Crack FAANG-level interviews" },
  { id: "competitive_programming", label: "Competitive Programming", icon: "⚡", desc: "Compete and rank globally" },
  { id: "learning_dsa", label: "Learning DSA", icon: "📚", desc: "Master data structures & algorithms" },
  { id: "exploring", label: "Just Exploring", icon: "🔍", desc: "Curious about what Aivon offers" },
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
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center font-space-grotesk relative overflow-hidden text-[var(--text-primary)]">
      
      <div className="absolute top-8 left-6 md:left-12 flex items-center gap-6 z-50">
        <Link 
          href="/"
          className="bg-transparent text-[var(--text-secondary)] hover:text-[var(--primary)] text-sm font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 group"
        >
          <Home size={14} className="group-hover:-translate-x-1 transition-transform" /> Home
        </Link>
        <Link 
          href="/sign-in"
          className="bg-transparent text-[var(--text-secondary)] hover:text-[var(--primary)] text-sm font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 group"
        >
          <LogIn size={14} className="group-hover:text-[var(--primary)] transition-colors" /> Sign In
        </Link>
      </div>

      <button 
        onClick={handleSkip}
        className="absolute top-8 right-6 md:right-12 bg-transparent text-[var(--text-secondary)] border-none text-sm font-semibold cursor-pointer tracking-wider uppercase transition-colors hover:text-[var(--text-primary)] z-50 flex items-center gap-2 group"
      >
        Skip Setup <SkipForward size={14} className="group-hover:translate-x-1 transition-transform" />
      </button>

      <div className="relative z-10 w-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] px-4" style={{ maxWidth: phase === "goals" ? 640 : 440 }}>
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[var(--primary)]/10 blur-[100px] pointer-events-none rounded-full" />

        <GlassCard className="p-8 md:p-12 shadow-2xl relative z-10 border border-[var(--border)] bg-[var(--card)]/80">
          
          <div className="flex gap-2 mb-10 h-1 rounded-full overflow-hidden">
             <div className="flex-1 bg-[var(--primary)] transition-colors duration-500 shadow-[0_0_10px_var(--glow-color)]" />
             <div className={`flex-1 transition-colors duration-500 ${phase === "goals" ? "bg-[var(--primary)] shadow-[0_0_10px_var(--glow-color)]" : "bg-[var(--border)]"}`} />
          </div>

          <AnimatePresence mode="wait">
            {phase === "username" && (
              <motion.div key="username" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3, ease: "easeOut" }}>
                <h2 className="text-3xl font-bold mb-2 tracking-tight uppercase text-gradient">
                  Identify Yourself
                </h2>
                <p className="text-[var(--text-secondary)] text-sm mb-8 font-mono">
                  &gt; This is how the system array will recognize you.
                </p>

                <label htmlFor="callsign" className="text-[var(--text-muted)] text-xs uppercase mb-2 block font-mono">Input Callsign</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none font-mono text-[var(--primary)]">
                    $
                  </div>
                  <input
                    id="callsign"
                    type="text"
                    placeholder="e.g. neural_coder"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    maxLength={20}
                    className="w-full py-4 pl-10 pr-4 bg-[var(--background)]/50 border border-[var(--border)] rounded-lg text-white text-base font-mono outline-none transition-all focus:border-[var(--primary)] focus:shadow-[0_0_15px_var(--glow-color)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-2 uppercase font-mono">
                  Lowercase, numbers, underscores · 3–20 chars
                </div>

                <button
                  onClick={handleUsernameSubmit}
                  className="w-full mt-8 py-4 bg-[var(--primary)] text-[var(--background)] font-bold rounded-lg uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_var(--glow-color)] flex items-center justify-center gap-2 group/btn"
                >
                  Proceed to Calibration <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            )}

            {phase === "goals" && (
              <motion.div key="goals" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3, ease: "easeOut" }}>
                <h2 className="text-3xl font-bold mb-2 tracking-tight uppercase text-gradient">
                  Calibrate Objectives
                </h2>
                <p className="text-[var(--text-secondary)] text-sm mb-8 font-mono">
                  &gt; Select operational targets to align system heuristics.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {GOALS.map((goal, idx) => {
                    const isSelected = selectedGoals.includes(goal.id);
                    return (
                      <button
                        key={goal.id}
                        onClick={() => toggleGoal(goal.id)}
                        className={`text-left p-5 rounded-xl border transition-all duration-300 group/goal animate-fade-in-up flex flex-col items-start ${
                          isSelected 
                            ? "bg-[var(--primary)]/10 border-[var(--primary)] shadow-[0_0_15px_var(--glow-color)] scale-[1.02]" 
                            : "bg-[var(--background)]/50 border-[var(--border)] hover:border-[var(--text-muted)] hover:bg-[var(--background)]"
                        }`}
                        style={{ animationDelay: `${(idx + 1) * 100}ms` }}
                      >
                        <div className="text-2xl mb-3 drop-shadow-lg">{goal.icon}</div>
                        <div className={`font-bold text-base mb-1 transition-colors ${isSelected ? "text-[var(--primary)]" : "text-[var(--text-secondary)] group-hover/goal:text-[var(--text-primary)]"}`}>
                          {goal.label}
                        </div>
                        <div className={`text-xs ${isSelected ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"}`}>
                          {goal.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleGoalsSubmit}
                  disabled={selectedGoals.length === 0 || loading}
                  className={`w-full mt-8 py-4 font-bold rounded-lg uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 group/btn ${
                    selectedGoals.length > 0 && !loading 
                      ? "bg-[var(--primary)] text-[var(--background)] cursor-pointer hover:scale-[1.02] hover:shadow-[0_0_20px_var(--glow-color)]" 
                      : "bg-[var(--border)]/50 text-[var(--text-muted)] cursor-not-allowed"
                  }`}
                >
                  {loading ? "INITIALIZING..." : "ENTER DASHBOARD"} 
                  {!loading && <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-3 bg-red-500/10 border border-red-500/50 text-red-400 text-sm text-center font-bold rounded-lg"
            >
              ⚠ {error}
            </motion.div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
