"use client";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

export default function LogoutPage() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Clear all auth state
    localStorage.removeItem("aivon_token");
    localStorage.removeItem("aivon_user");
    
    // Clear NextAuth session cookie without auto-redirecting so we see the animation
    signOut({ redirect: false }).catch(console.error);

    // Small delay for the visual effect
    const timer = setTimeout(() => setDone(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050505",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      position: "relative",
    }}>
      {/* Nebular gradient */}
      <div style={{
        position: "fixed", inset: 0,
        background: "radial-gradient(ellipse at 50% 50%, rgba(138,43,226,0.06) 0%, transparent 60%)",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "relative",
        zIndex: 1,
        textAlign: "center",
        animation: "fadeIn 0.6s ease",
      }}>
        <div style={{
          fontSize: 48,
          marginBottom: 20,
          opacity: done ? 1 : 0.5,
          transition: "opacity 0.5s ease",
        }}>
          {done ? "👋" : "🔒"}
        </div>

        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          color: "#f4f4f5",
          marginBottom: 8,
        }}>
          {done ? "Neural Link Disconnected" : "Disconnecting..."}
        </h1>

        <p style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: 14,
          marginBottom: 32,
        }}>
          {done ? "You've been safely signed out." : "Clearing session data..."}
        </p>

        {done && (
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={() => window.location.href = "/onboarding"}
              style={{
                padding: "12px 28px",
                background: "linear-gradient(135deg, #00E5FF, #3b82f6)",
                border: "none",
                borderRadius: 12,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Sign in again
            </button>
            <button
              onClick={() => window.location.href = "/"}
              style={{
                padding: "12px 28px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                color: "rgba(255,255,255,0.5)",
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Go home
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
