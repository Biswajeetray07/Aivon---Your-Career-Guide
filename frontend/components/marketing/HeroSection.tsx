"use client";

import { motion } from "framer-motion";
import Link from "next/link";


export function HeroSection() {
  return (
    <section className="w-full min-h-[90vh] flex flex-col items-center justify-center relative px-6 py-20">
      
      {/* Background glitch effect/large typography */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-5">
        <h1 className="text-[20vw] font-bold leading-none select-none tracking-tighter whitespace-nowrap">
          AIVON JUDGE
        </h1>
      </div>

      <div className="z-10 flex flex-col items-center max-w-5xl text-center space-y-8 mt-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center space-x-2 border border-white/10 bg-black/50 px-4 py-2 text-xs uppercase tracking-widest text-[#00e5ff]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <span>Next-Gen Execution Engine</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9] text-white"
        >
          CODE. JUDGE. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] to-[#00b8d4]">
            IMPROVE.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-xl text-[#8b8ca7] max-w-2xl font-medium tracking-wide"
        >
          Solve real problems, get instant AI feedback, and track your growth with a production-grade judge built for serious engineers.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-6 mt-8 w-full sm:w-auto"
        >
          <Link
            href="/sign-in"
            className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#00e5ff] text-black font-bold text-sm tracking-widest uppercase transition-all hover:bg-[#00f0ff] hover:shadow-[0_0_30px_rgba(0,229,255,0.4)]"
          >
            Start Solving &rarr;
            <div className="absolute inset-0 border border-[#00e5ff] scale-105 opacity-0 group-hover:opacity-100 transition-all group-hover:scale-110" />
          </Link>

          <Link
            href="/problems"
            className="inline-flex items-center justify-center px-8 py-4 border border-white/20 text-white font-bold text-sm tracking-widest uppercase transition-all hover:border-white/60 hover:bg-white/5"
          >
            Explore Problems
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
