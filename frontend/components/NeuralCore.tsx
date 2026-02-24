"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/api";

export default function NeuralCore() {
  const pathname = usePathname();
  const [user, setUser] = useState<{name?: string; rating?: number; avatar?: string} | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    async function load() {
      try {
        const { user } = await getSession();
        setUser(user as { name?: string; rating?: number; avatar?: string; } | null);
      } catch {
        setUser(null);
      }
    }
    load();

    // Listen to local storage changes for immediate sync after login/logout
    const onStorage = () => load();
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearTimeout(timer);
    };
  }, [pathname]);

  if (!mounted) return null;

  // Don't show the core on onboarding/sign-in routes since they have their own immersive states
  if (pathname === "/onboarding" || pathname === "/sign-in" || pathname === "/sign-up") {
    return null;
  }

  return (
    <div style={{
      position: "fixed",
      top: 24,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      gap: 16,
      background: "rgba(10, 10, 10, 0.7)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(138, 43, 226, 0.3)",
      boxShadow: "0 0 30px rgba(138, 43, 226, 0.15), inset 0 0 20px rgba(138, 43, 226, 0.05)",
      borderRadius: 999,
      padding: "8px 24px",
      color: "#fff",
      fontFamily: "var(--font-inter, system-ui)",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      maxWidth: "90vw"
    }}>
      
      {/* Brand / Logo */}
      <Link href="/problems" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit" }}>
        <div style={{
          width: 24, height: 24, borderRadius: "50%",
          background: "linear-gradient(135deg, #8A2BE2, #00FFFF)",
          boxShadow: "0 0 10px rgba(0, 255, 255, 0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: "bold"
        }}>
          ⚡
        </div>
        <span style={{ fontWeight: 700, letterSpacing: "-0.03em", fontSize: 15 }}>AIVON</span>
      </Link>

      <div style={{ width: 1, height: 24, background: "rgba(255, 255, 255, 0.1)" }} />

      {/* Navigation */}
      <div style={{ display: "flex", gap: 20, fontSize: 13, fontWeight: 500 }}>
        <Link href="/problems" style={{ color: pathname === "/problems" ? "#fff" : "rgba(255, 255, 255, 0.6)", textDecoration: "none", transition: "color 0.2s" }}>Arena</Link>
        <Link href="/leaderboard" style={{ color: pathname === "/leaderboard" ? "#fff" : "rgba(255, 255, 255, 0.6)", textDecoration: "none", transition: "color 0.2s" }}>Leaderboard</Link>
      </div>

      {user ? (
        <>
          <div style={{ width: 1, height: 24, background: "rgba(255, 255, 255, 0.1)" }} />
          
          {/* User Info */}
          <Link href="/profile" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{user.name || "Anon"}</span>
              <span style={{ fontSize: 11, color: "#00FFFF", fontWeight: 500 }}>{user.rating} ELO</span>
            </div>
            {/* Avatar / Identity Block */}
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#1a1a2e", border: "1px solid rgba(0, 255, 255, 0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden"
            }}>
              {user.avatar ? (
                <img src={user.avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 14 }}>👾</span>
              )}
            </div>
          </Link>
        </>
      ) : (
        <>
          <div style={{ width: 1, height: 24, background: "rgba(255, 255, 255, 0.1)" }} />
          <Link href="/onboarding" style={{
            fontSize: 13, fontWeight: 600, color: "#fff",
            textDecoration: "none", background: "rgba(255, 255, 255, 0.1)",
            padding: "6px 16px", borderRadius: 999, transition: "background 0.2s"
          }}>
            Init Sequence
          </Link>
        </>
      )}
    </div>
  );
}
