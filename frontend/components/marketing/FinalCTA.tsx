"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "./lucide";

export function FinalCTA() {
  return (
    <section className="w-full py-32 px-6 flex justify-center bg-[#050505] relative overflow-hidden">
      
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[400px] bg-[#00e5ff]/10 blur-[150px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl w-full text-center relative z-10 flex flex-col items-center border border-[#00e5ff]/20 bg-[#0a0a0f]/80 backdrop-blur-md p-12 md:p-20"
      >
        <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase leading-none mb-6">
          Ready to Level Up <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] to-white">Your Problem Solving?</span>
        </h2>
        
        <Link
          href="/sign-in"
          className="group relative inline-flex items-center justify-center px-10 py-5 bg-[#00e5ff] text-black font-bold text-lg tracking-widest uppercase transition-all mt-8 hover:bg-white overflow-hidden shadow-[0_0_40px_rgba(0,229,255,0.3)]"
        >
          <span className="relative z-10 flex items-center gap-2">
            Start Solving for Free <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </span>
          <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
        </Link>

        <p className="text-[#8b8ca7] mt-6 tracking-wide text-sm font-mono opacity-80">
           No credit card. No setup. Just code.
        </p>
      </motion.div>
    </section>
  );
}
