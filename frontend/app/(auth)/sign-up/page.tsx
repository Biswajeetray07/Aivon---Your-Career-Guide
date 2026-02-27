"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api";
import { signIn } from "next-auth/react";
import { ArrowRight, Home, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Typewriter } from "@/components/ui/typewriter";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(email, password, name);
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      
      if (res?.error) {
        setError("Session initialization failed");
      } else {
        router.push("/onboarding");
      }
    } catch (err: any) {
      let errorData = err.data || err.message || "Registration failed";
      
      // If errorData contains a stringified JSON (common from some backends)
      if (typeof errorData?.error === 'string' && (errorData.error.startsWith('[') || errorData.error.startsWith('{'))) {
        try {
          errorData = JSON.parse(errorData.error);
        } catch {
          // ignore parsing error
        }
      } else if (typeof errorData === 'string' && (errorData.startsWith('[') || errorData.startsWith('{'))) {
         try {
          errorData = JSON.parse(errorData);
        } catch {
          // ignore
        }
      }
      
      setError(errorData);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-[100dvh] bg-transparent flex items-center justify-center font-geist-mono relative overflow-hidden text-white py-12">

      {/* Top Left Navigation (matching Onboarding template) */}
      <div className="absolute top-8 left-6 md:left-12 flex items-center gap-6 z-50">
        <Link 
          href="/"
          className="text-[var(--text-secondary)] hover:text-[#00E5B0] text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 group"
        >
          <span className="opacity-50 group-hover:-translate-x-1 transition-transform">[</span>
          <Home size={12} className="group-hover:text-[#00E5B0] transition-colors" /> RETURN TO HOME
          <span className="opacity-50 group-hover:translate-x-1 transition-transform">]</span>
        </Link>
      </div>

      <motion.div 
        className="relative z-10 w-full px-4 flex flex-col items-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" 
        style={{ maxWidth: 460 }}
        initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.4, ease: "circOut" }}
      >
        
        {/* Glow behind terminal */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#00E5B0]/5 blur-[120px] pointer-events-none rounded-full" />

        {/* Authentication Terminal */}
        <div className="w-full p-8 md:p-10 relative z-10 bg-[#060D10]/80 backdrop-blur-lg border border-white/5 shadow-sm rounded-none">
          
          {/* Decorative Corner Cuts */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00E5B0]" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00E5B0]" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00E5B0]" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00E5B0]" />

          {/* Simple Header Content */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-[#00E5B0]/10 border border-white/5 rounded-xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-sm text-[#00E5B0]">
              <UserPlus size={24} />
            </div>
            <Typewriter 
              text="Join Aivon Nexus" 
              className="text-2xl md:text-3xl font-space-grotesk font-bold tracking-tight text-white mb-2 justify-center"
              speed={60}
            />
            <Typewriter 
              text="Establish your neural link" 
              className="text-[var(--text-secondary)] text-sm font-geist-mono justify-center"
              delay={1000}
            />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
            
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="bg-[#FF2A2A]/5 border border-[#FF2A2A]/30 overflow-hidden relative group mb-2"
                >
                  <div className="absolute top-0 left-0 w-[2px] h-full bg-[#FF2A2A]/60" />
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[#FF2A2A] text-[10px] font-bold uppercase tracking-widest mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF2A2A] animate-pulse" />
                      Validation Conflict Detected
                    </div>
                    
                    {Array.isArray(error) ? (
                      <ul className="flex flex-col gap-2.5">
                        {error.map((err, idx) => (
                          <li key={idx} className="flex gap-3 text-[11px] leading-relaxed text-[#FF2A2A]/90 font-geist-mono">
                            <span className="opacity-40 select-none">[{String(idx + 1).padStart(2, '0')}]</span>
                            <span className="flex-1">
                              <span className="text-[#FF2A2A] font-bold mr-1">
                                {err.path?.[0] ? `${err.path[0].toUpperCase()}:` : "ERROR:"}
                              </span>
                              {err.message}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-[#FF2A2A]/90 font-geist-mono pl-4 border-l border-[#FF2A2A]/20">
                        {typeof error === 'string' ? error : JSON.stringify(error)}
                      </p>
                    )}
                  </div>
                  
                  {/* Subtle noise pattern overlay */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label htmlFor="name" className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest mb-2 block">Name (Optional)</label>
              <div className="relative group w-full">
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Operative ID"
                  className="bg-[#05070A]/50 border border-white/5 outline-none text-white w-full px-4 py-2.5 text-sm font-geist-mono focus:border-[#00E5B0] focus:shadow-[0_0_10px_rgba(0,229,176,0.1)] transition-all placeholder:text-[var(--text-muted)]"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest mb-2 block">Email</label>
              <div className="relative group w-full">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@aivon.cloud"
                  className="bg-[#05070A]/50 border border-white/5 outline-none text-white w-full px-4 py-2.5 text-sm font-geist-mono focus:border-[#00E5B0] focus:shadow-[0_0_10px_rgba(0,229,176,0.1)] transition-all placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest mb-2 block">Password</label>
              <div className="relative group w-full">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="bg-[#05070A]/50 border border-white/5 outline-none text-white w-full px-4 py-2.5 text-sm font-geist-mono focus:border-[#00E5B0] focus:shadow-[0_0_10px_rgba(0,229,176,0.1)] transition-all placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 relative group overflow-hidden flex items-center justify-center gap-2 w-full py-3.5 rounded-lg border border-white/5 bg-[#0A0F14]/80 text-[#00E5B0] text-[11px] font-bold uppercase tracking-[0.15em] hover:border-white/5 hover:text-white transition-all shadow-sm hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#00E5B0] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {loading ? "INITIALIZING..." : "[ CREATE_OPERATIVE_ID ]"} 
              {!loading && <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />}
            </button>
            
          </form>
          
          <p className="text-center mt-6 text-[10px] text-[var(--text-secondary)] tracking-widest uppercase">
            Access procured? <Link href="/sign-in" className="text-[#00E5B0] hover:text-white transition-colors border-b border-white/5 hover:border-white font-bold ml-1">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
