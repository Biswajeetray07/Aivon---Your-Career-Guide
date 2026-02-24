"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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
    // Power user skip directly to dashboard
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
      // Save username + goals to backend
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
    <div style={{
      minHeight: "100vh",
      background: "#050505",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      position: "relative",
      overflow: "hidden",
      color: "#fff"
    }}>
      {/* Background Matrix */}
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* Skip Button */}
      <button 
        onClick={handleSkip}
        style={{
          position: "absolute",
          top: 32,
          right: "5vw",
          background: "transparent",
          color: "#71717a",
          border: "none",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          transition: "color 0.2s",
          zIndex: 100
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
        onMouseLeave={(e) => e.currentTarget.style.color = "#71717a"}
      >
        Skip Setup →
      </button>

      {/* Main content card */}
      <div style={{
        position: "relative",
        zIndex: 10,
        width: "100%",
        maxWidth: phase === "goals" ? 640 : 440,
        padding: "48px",
        background: "#0a0a0a",
        border: "1px solid #27272a",
        boxShadow: "20px 20px 0px rgba(0,0,0,1)",
        transition: "max-width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        
        {/* Progress Indicator */}
        <div style={{ display: "flex", gap: 8, marginBottom: 40 }}>
           <div style={{ flex: 1, height: 4, background: "#39FF14" }} />
           <div style={{ flex: 1, height: 4, background: phase === "goals" ? "#39FF14" : "#27272a", transition: "background 0.4s" }} />
        </div>

        <AnimatePresence mode="wait">
          {/* ─── PHASE: USERNAME ─── */}
          {phase === "username" && (
            <motion.div key="username" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3, ease: "easeOut" }}>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: "#fff", marginBottom: 8, letterSpacing: "-0.04em", textTransform: "uppercase" }}>
                Identify Yourself
              </h2>
              <p style={{ color: "#a1a1aa", fontSize: 14, marginBottom: 32 }}>
                This is how the system array will recognize you.
              </p>

              <label htmlFor="callsign" style={{ color: "#71717a", fontSize: 12, textTransform: "uppercase", marginBottom: 8, display: "block" }}>Input Callsign</label>
              <input
                id="callsign"
                type="text"
                placeholder="CALLSIGN (e.g. neural_coder)"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                maxLength={20}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: "#050505",
                  border: "2px solid #27272a",
                  borderRadius: 0,
                  color: "#fff",
                  fontSize: 16,
                  fontFamily: "'JetBrains Mono', monospace",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s"
                }}
                onFocus={(e) => e.target.style.borderColor = "#39FF14"}
                onBlur={(e) => e.target.style.borderColor = "#27272a"}
              />
              <div style={{ fontSize: 12, color: "#71717a", marginTop: 8, textTransform: "uppercase" }}>
                Lowercase, numbers, underscores · 3–20 chars
              </div>

              <button
                onClick={handleUsernameSubmit}
                style={{
                  width: "100%",
                  marginTop: 32,
                  padding: "16px",
                  background: "#39FF14",
                  border: "none",
                  borderRadius: 0,
                  color: "#050505",
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}
              >
                Proceed to Calibration
              </button>
            </motion.div>
          )}

          {/* ─── PHASE: GOALS (Bento Grid) ─── */}
          {phase === "goals" && (
            <motion.div key="goals" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3, ease: "easeOut" }}>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: "#fff", marginBottom: 8, letterSpacing: "-0.04em", textTransform: "uppercase" }}>
                Calibrate Objectives
              </h2>
              <p style={{ color: "#a1a1aa", fontSize: 14, marginBottom: 32 }}>
                Select operational targets to align system heuristics.
              </p>

              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}>
                {GOALS.map((goal) => {
                  const isSelected = selectedGoals.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      onClick={() => toggleGoal(goal.id)}
                      style={{
                        padding: "24px 20px",
                        background: isSelected ? "#18181b" : "#050505",
                        border: `2px solid ${isSelected ? "#39FF14" : "#27272a"}`,
                        borderRadius: 0, cursor: "pointer", textAlign: "left",
                        fontFamily: "inherit", transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                        transform: isSelected ? "scale(1.02)" : "scale(1)",
                        boxShadow: isSelected ? "4px 4px 0px rgba(57,255,20,0.2)" : "none",
                      }}
                      onMouseEnter={(e) => { 
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "#52525b"; 
                          e.currentTarget.style.background = "#09090b";
                        }
                      }}
                      onMouseLeave={(e) => { 
                        if (!isSelected) { 
                          e.currentTarget.style.borderColor = "#27272a"; 
                          e.currentTarget.style.background = "#050505";
                        } 
                      }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 12 }}>{goal.icon}</div>
                      <div style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: isSelected ? "#fff" : "#a1a1aa",
                        marginBottom: 4,
                      }}>
                        {goal.label}
                      </div>
                      <div style={{
                        fontSize: 12,
                        color: isSelected ? "#a1a1aa" : "#71717a",
                      }}>
                        {goal.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleGoalsSubmit}
                disabled={selectedGoals.length === 0 || loading}
                style={{
                  width: "100%",
                  marginTop: 32,
                  padding: "16px",
                  background: selectedGoals.length > 0 ? "#39FF14" : "#18181b",
                  border: "none",
                  borderRadius: 0,
                  color: selectedGoals.length > 0 ? "#050505" : "#52525b",
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: selectedGoals.length > 0 && !loading ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                  transition: "background 0.2s, color 0.2s",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}
              >
                {loading ? "INITIALIZING..." : "ENTER DASHBOARD →"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error display */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 20,
              padding: "12px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid #ef4444",
              color: "#fca5a5",
              fontSize: 13,
              textAlign: "center",
              fontWeight: 600
            }}
          >
            {error}
          </motion.div>
        )}
      </div>
    </div>
  );
}
