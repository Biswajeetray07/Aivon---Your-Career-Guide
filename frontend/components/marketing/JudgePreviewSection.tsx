"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Check, Terminal, Play, Loader2 } from "./lucide";

export function JudgePreviewSection() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.4 });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isInView) {
      const timers = [
        setTimeout(() => setStep(1), 800),    // Run code
        setTimeout(() => setStep(2), 2000),   // Running...
        setTimeout(() => setStep(3), 3500),   // Accepted
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [isInView]);

  return (
    <section className="w-full py-24 px-6 flex justify-center bg-[#0a0a0f] border-y border-white/5 relative overflow-hidden">
      {/* Visual Depth overlay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-[#00e5ff]/5 blur-[120px] pointer-events-none" />

      <div className="max-w-5xl w-full flex flex-col md:flex-row items-center gap-16 relative z-10">
        
        <div className="flex-1 space-y-6">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white uppercase">
            See Aivon <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] to-[#00b8d4]">
              In Action
            </span>
          </h2>
          <p className="text-[#8b8ca7] text-lg max-w-sm">
            Real-time execution. No guesswork. Our isolated sandbox validates your logic against rigorous test suites instantly.
          </p>
        </div>

        <div className="flex-[1.5] w-full" ref={containerRef}>
          <div className="bg-black border border-[#27272a] shadow-2xl overflow-hidden font-mono text-sm transform-gpu transition-all hover:border-[#00e5ff]/30">
            {/* Terminal Header */}
            <div className="flex items-center px-4 py-3 border-b border-[#27272a] bg-[#111118]">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-800" />
                <div className="w-3 h-3 rounded-full bg-slate-800" />
                <div className="w-3 h-3 rounded-full bg-slate-800" />
              </div>
              <div className="mx-auto text-[#8b8ca7] text-xs uppercase tracking-widest flex items-center gap-2">
                <Terminal size={12} /> main.cpp
              </div>
            </div>

            {/* Terminal Body */}
            <div className="p-6 relative text-[#f1f0ff]">
              <div className="opacity-70 pb-6 border-b border-white/5 select-none text-[#00b8d4] flex flex-col gap-1">
                <span><span className="text-[#ef4444]">class</span> <span className="text-[#eab308]">Solution</span> {'{'}</span>
                <span className="pl-4"><span className="text-[#ef4444]">public:</span></span>
                <span className="pl-8"><span className="text-[#22c55e]">vector</span>&lt;<span className="text-[#22c55e]">int</span>&gt; <span className="text-white">twoSum</span>(<span className="text-[#22c55e]">vector</span>&lt;<span className="text-[#22c55e]">int</span>&gt;& nums, <span className="text-[#22c55e]">int</span> target) {'{'}</span>
                <span className="pl-12 opacity-50 italic">{"// Optimal O(N) solution initialized"}</span>
                <span className="pl-12">unordered_map&lt;<span className="text-[#22c55e]">int</span>, <span className="text-[#22c55e]">int</span>&gt; m;</span>
                <span className="pl-12"><span className="text-[#ef4444]">for</span> (<span className="text-[#22c55e]">int</span> i = <span className="text-[#00e5ff]">0</span>; i &lt; nums.size(); i++) {'{'}</span>
                <span className="pl-16">...</span>
                <span className="pl-8">{'}'}</span>
                <span>{'}'};</span>
              </div>

              {/* Status Output */}
              <div className="mt-6 h-[80px] flex items-center justify-between">
                
                <div className="flex items-center gap-4">
                  {step >= 1 && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                      <span className="text-[#8b8ca7]">Status:</span>
                    </motion.div>
                  )}
                  
                  {step === 1 && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-white">
                      <Play size={14} className="text-[#00e5ff]" /> Compiling...
                    </motion.div>
                  )}
                  {step === 2 && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-yellow-500">
                      <Loader2 size={14} className="animate-spin" /> Judging on 104 Test Cases
                    </motion.div>
                  )}
                  {step === 3 && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 text-[#22c55e] bg-[#22c55e]/10 px-4 py-2 border border-[#22c55e]/20">
                      <Check size={16} /> <span className="font-bold uppercase tracking-widest text-[#22c55e]">Accepted</span>
                    </motion.div>
                  )}
                </div>

                {step === 3 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 text-xs text-[#8b8ca7]">
                    <div>Runtime: <span className="text-white font-bold">12 ms</span></div>
                    <div>Memory: <span className="text-white font-bold">10.4 MB</span></div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
