"use client";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Typewriter } from "@/components/ui/typewriter";
import { LogIn, ZapOff } from "lucide-react";

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
    <div className="min-h-[100dvh] bg-transparent flex items-center justify-center font-geist-mono relative overflow-hidden text-white py-12">
      <motion.div 
        className="relative z-10 w-full px-4 flex flex-col items-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" 
        style={{ maxWidth: 460 }}
        initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.4, ease: "circOut" }}
      >
        {/* Glow behind terminal */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#FF2A2A]/5 blur-[120px] pointer-events-none rounded-full" />

        {/* Console Terminal */}
        <div className="w-full p-8 md:p-10 relative z-10 bg-[#060D10]/80 backdrop-blur-lg border border-white/5 shadow-sm rounded-none text-center">
          
          {/* Decorative Corner Cuts */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#FF2A2A]" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#FF2A2A]" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#FF2A2A]" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#FF2A2A]" />

          {/* Icon */}
          <div className={`w-12 h-12 bg-[#FF2A2A]/10 border border-[#FF2A2A]/20 rounded-xl flex items-center justify-center mx-auto mb-6 transition-all duration-500 ${done ? 'text-[#FF2A2A] shadow-[0_0_15px_rgba(255,42,42,0.3)]' : 'text-white/30'}`}>
            <ZapOff size={24} className={done ? "" : "animate-pulse"} />
          </div>

          <h1 className="text-2xl md:text-3xl font-space-grotesk font-bold tracking-tight text-white mb-3">
             {done ? "Neural Link Disconnected" : "Disconnecting..."}
          </h1>

          <p className="text-[var(--text-secondary)] text-[11px] font-geist-mono uppercase tracking-widest mb-10 min-h-[20px]">
             {done ? "System purged and connection terminated." : "Decrypting session tokens..."}
          </p>

          <div className={`flex flex-col gap-4 transition-all duration-500 ${done ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <Link
              href="/sign-in"
              className="relative group overflow-hidden flex items-center justify-center gap-2 w-full py-3.5 rounded-lg border border-white/5 bg-[#0A0F14]/80 text-[#00E5B0] text-[11px] font-bold uppercase tracking-[0.15em] hover:border-white/5 hover:text-white transition-all shadow-sm hover:shadow-sm"
            >
              <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#00E5B0] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              [ RE-ESTABLISH_UPLINK ]
              <LogIn size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/"
              className="relative group flex items-center justify-center gap-2 w-full py-3.5 rounded-lg border border-transparent bg-transparent text-[var(--text-secondary)] text-[11px] font-bold uppercase tracking-[0.15em] hover:text-white transition-all"
            >
              Return to Surface Web
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
