"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveSocket } from "@/hooks/useLiveSocket";
import { apiPost } from "@/lib/api";
import Link from "next/link";
import { Loader2, X } from "lucide-react";

type ArenaState = "LOBBY" | "QUEUED" | "MATCHED" | "COMPLETED";

interface MatchInfo {
  matchId: string;
  problemSlug: string;
  problemTitle: string;
  difficulty: string;
  opponentId?: string;
}

export default function ArenaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as any;
  const userId = user?.id;

  const [arenaState, setArenaState] = useState<ArenaState>("LOBBY");
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [opponentProgress, setOpponentProgress] = useState<string>("Waiting...");
  const [winner, setWinner] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [arenaStats, setArenaStats] = useState({ totalMatches: 0, wins: 0, winRate: 0 });

  // Fetch arena stats
  useEffect(() => {
    if (status === "authenticated" && arenaState === "LOBBY") {
      apiPost<any>("/api/arena/stats", {}).then(res => {
        setArenaStats({
          totalMatches: res.totalMatches || 0,
          wins: res.wins || 0,
          winRate: res.winRate || 0
        });
      }).catch(console.error);
    }
  }, [status, arenaState]);

  // Subscribe to user-specific topic for match notifications + match room
  const { listen } = useLiveSocket(
    userId
      ? [
          `user_${userId}`,
          ...(matchInfo?.matchId ? [`arena_match_${matchInfo.matchId}`] : []),
        ]
      : []
  );

  // Listen for match found
  useEffect(() => {
    const unlisten = listen("arena_matched", (payload: MatchInfo) => {
      setMatchInfo(payload);
      setArenaState("MATCHED");
      setSearchTime(0);
    });
    return unlisten;
  }, [listen]);

  // Listen for opponent progress
  useEffect(() => {
    const unlisten = listen("arena_progress", (payload: any) => {
      if (payload.userId !== userId) {
        setOpponentProgress(payload.event === "SUBMITTED" ? "Code submitted!" : payload.event);
      }
    });
    return unlisten;
  }, [listen, userId]);

  // Listen for match result
  useEffect(() => {
    const unlisten = listen("arena_result", (payload: any) => {
      setWinner(payload.winnerId);
      setArenaState("COMPLETED");
    });
    return unlisten;
  }, [listen]);

  // Search timer
  useEffect(() => {
    if (arenaState !== "QUEUED") return;
    const interval = setInterval(() => setSearchTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [arenaState]);

  const joinQueue = useCallback(async () => {
    try {
      setArenaState("QUEUED");
      const res = await apiPost<any>("/api/arena/queue", {});
      if (res.status === "MATCHED") {
        setMatchInfo(res);
        setArenaState("MATCHED");
      }
    } catch (err) {
      console.error("Failed to join queue:", err);
      setArenaState("LOBBY");
    }
  }, []);

  const leaveQueue = useCallback(async () => {
    try {
      await apiPost("/api/arena/leave", {});
    } catch {}
    setArenaState("LOBBY");
    setSearchTime(0);
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00E5B0] animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/sign-in");
    return null;
  }

  return (
    <div className="min-h-screen pt-[120px] pb-20 w-full max-w-[1500px] mx-auto px-6 md:px-12 font-space-grotesk flex flex-col items-center relative z-10 bg-transparent">

      <AnimatePresence mode="wait">
        {/* ═══ LOBBY STATE ═══ */}
        {arenaState === "LOBBY" && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-3xl flex flex-col items-center gap-12"
          >
            {/* Header */}
            <div className="text-center flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-32 h-32 bg-[#060D10] border-2 border-[#00E5B0]/30 flex items-center justify-center [clip-path:polygon(15%_0%,85%_0%,100%_15%,100%_85%,85%_100%,15%_100%,0%_85%,0%_15%)] relative group">
                  <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(0,229,176,0.15)_90deg,transparent_90deg)] animate-[spin_4s_linear_infinite] pointer-events-none" />
                  <span className="text-5xl font-vt323 text-[#00E5B0] drop-shadow-[0_0_15px_#00E5B0] z-10 tracking-widest">VS</span>
                </div>
              </div>

              <h1 className="text-6xl md:text-7xl font-vt323 tracking-widest uppercase text-transparent bg-clip-text bg-[linear-gradient(180deg,#FFFFFF_0%,#A1A1AA_100%)]">
                COMBAT ARENA
              </h1>
              <p className="text-sm font-geist-mono text-[var(--text-secondary)] uppercase tracking-[0.2em] max-w-md text-center">
                1v1 competitive coding. Race to solve the same problem. The fastest accepted solution wins.
              </p>
            </div>

            {/* Enter Queue Button */}
            <button
              onClick={joinQueue}
              className="relative overflow-hidden group h-16 px-12 border-2 border-[#00E5B0]/50 bg-transparent text-[#00E5B0] font-bold uppercase tracking-[0.2em] text-lg transition-all duration-300 hover:bg-[#00E5B0]/10 hover:border-[#00E5B0] hover:text-white hover:shadow-[0_0_30px_rgba(0,229,176,0.3)] flex items-center gap-4"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00E5B0]/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="w-2.5 h-2.5 bg-[#00E5B0] rounded-full group-hover:animate-ping z-10" />
              <span className="z-10">ENTER QUEUE</span>
            </button>

            {/* Stats Preview */}
            <div className="grid grid-cols-3 gap-6 w-full max-w-md">
              {[
                { label: "YOUR_RATING", value: user?.rating || 1200, color: "#00C2FF" },
                { label: "MATCHES", value: arenaStats.totalMatches, color: "#00E5B0" },
                { label: "WIN_RATE", value: arenaStats.totalMatches > 0 ? `${arenaStats.winRate}%` : "—", color: "#FACC15" },
              ].map((s) => (
                <div key={s.label} className="bg-[#060D10] border border-white/10 p-4 flex flex-col items-center gap-2 hover-target-matrix">
                  <span className="text-[9px] font-geist-mono text-white/40 tracking-[0.2em] uppercase">{s.label}</span>
                  <span className="text-3xl font-vt323 tracking-widest" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ QUEUED STATE ═══ */}
        {arenaState === "QUEUED" && (
          <motion.div
            key="queued"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-xl flex flex-col items-center gap-10"
          >
            <div className="relative w-40 h-40">
              <div className="absolute inset-0 border-2 border-[#00E5B0]/30 rounded-full animate-[spin_3s_linear_infinite]" />
              <div className="absolute inset-4 border-2 border-[#00C2FF]/20 rounded-full animate-[spin_5s_linear_infinite_reverse]" />
              <div className="absolute inset-8 border-2 border-dashed border-[#00E5B0]/40 rounded-full animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-vt323 text-[#00E5B0] animate-pulse drop-shadow-[0_0_15px_#00E5B0] tracking-widest">SCAN</span>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-4xl font-vt323 tracking-widest text-[#00E5B0] uppercase mb-3">
                SEARCHING FOR OPPONENT
              </h2>
              <p className="text-sm font-geist-mono text-[var(--text-secondary)] tracking-[0.2em] uppercase">
                Elapsed: <span className="text-[#00C2FF] font-bold">{searchTime}s</span>
              </p>
            </div>

            <button
              onClick={leaveQueue}
              className="flex items-center gap-2 px-6 py-3 border border-[#FF5F56]/50 text-[#FF5F56] font-geist-mono text-xs uppercase tracking-widest hover:bg-[#FF5F56]/10 transition-colors"
            >
              <X size={14} />
              ABORT SEARCH
            </button>
          </motion.div>
        )}

        {/* ═══ MATCHED STATE ═══ */}
        {arenaState === "MATCHED" && matchInfo && (
          <motion.div
            key="matched"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-3xl flex flex-col items-center gap-10"
          >
            <div className="text-center">
              <h2 className="text-5xl font-vt323 tracking-widest text-[#00E5B0] uppercase mb-4 animate-pulse">
                MATCH FOUND
              </h2>
              <p className="text-sm font-geist-mono text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                Problem: <span className="text-white font-bold">{matchInfo.problemTitle}</span>
                {" "} | {" "}
                <span className={`font-bold ${matchInfo.difficulty === "EASY" ? "text-[#00E5B0]" : matchInfo.difficulty === "MEDIUM" ? "text-[#FACC15]" : "text-[#FF5F56]"}`}>
                  {matchInfo.difficulty}
                </span>
              </p>
            </div>

            {/* VS Display */}
            <div className="flex items-center gap-8">
              <div className="bg-[#060D10] border border-[#00E5B0]/30 p-6 flex flex-col items-center gap-3 min-w-[160px]">
                <div className="w-16 h-16 bg-[#00E5B0]/10 border border-[#00E5B0]/30 flex items-center justify-center text-2xl font-vt323 text-[#00E5B0]">
                  {user?.name?.[0]?.toUpperCase() || "Y"}
                </div>
                <span className="text-xs font-geist-mono text-white uppercase tracking-widest">YOU</span>
              </div>

              <span className="text-4xl font-vt323 text-[#FF5F56] animate-pulse tracking-widest">VS</span>

              <div className="bg-[#060D10] border border-[#FF5F56]/30 p-6 flex flex-col items-center gap-3 min-w-[160px]">
                <div className="w-16 h-16 bg-[#FF5F56]/10 border border-[#FF5F56]/30 flex items-center justify-center text-2xl font-vt323 text-[#FF5F56]">
                  ?
                </div>
                <span className="text-xs font-geist-mono text-white/60 uppercase tracking-widest">OPPONENT</span>
              </div>
            </div>

            {/* Opponent Progress */}
            <div className="bg-[#060D10] border border-white/10 p-4 w-full max-w-md">
              <div className="text-[10px] font-geist-mono text-[#00C2FF]/60 tracking-[0.2em] uppercase mb-2">OPPONENT_STATUS</div>
              <div className="text-sm font-geist-mono text-white/80">{opponentProgress}</div>
            </div>

            {/* Go to Problem */}
            <Link
              href={`/problems/${matchInfo.problemSlug}`}
              className="relative overflow-hidden group h-14 px-10 border-2 border-[#00E5B0]/50 bg-transparent text-[#00E5B0] font-bold uppercase tracking-[0.15em] transition-all hover:bg-[#00E5B0]/10 hover:border-[#00E5B0] hover:text-white hover:shadow-[0_0_30px_rgba(0,229,176,0.3)] flex items-center gap-3"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00E5B0]/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="z-10">OPEN PROBLEM EDITOR</span>
            </Link>
          </motion.div>
        )}

        {/* ═══ COMPLETED STATE ═══ */}
        {arenaState === "COMPLETED" && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-xl flex flex-col items-center gap-10"
          >
            <div
              className={`text-8xl font-vt323 tracking-widest ${winner === userId ? "text-[#FACC15] drop-shadow-[0_0_30px_#FACC15]" : "text-[#FF5F56]"} animate-bounce`}
            >
              {winner === userId ? "★" : "✕"}
            </div>
            <h2 className={`text-6xl font-vt323 tracking-widest uppercase ${winner === userId ? "text-[#FACC15]" : "text-[#FF5F56]"}`}>
              {winner === userId ? "VICTORY" : "DEFEAT"}
            </h2>
            <p className="text-sm font-geist-mono text-[var(--text-secondary)] uppercase tracking-[0.2em]">
              {winner === userId ? "You solved it first. Rating +15." : "Your opponent was faster. Rating -5."}
            </p>
            <button
              onClick={() => { setArenaState("LOBBY"); setMatchInfo(null); setWinner(null); setOpponentProgress("Waiting..."); }}
              className="h-12 px-8 border border-[#00E5B0]/50 text-[#00E5B0] font-bold uppercase tracking-widest text-xs hover:bg-[#00E5B0]/10 transition-colors"
            >
              RETURN TO LOBBY
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
