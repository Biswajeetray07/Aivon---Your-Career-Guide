"use client";

import { motion } from "framer-motion";

export function DifficultyLadder() {
  const steps = [
    { level: "EASY", desc: "Build syntactical muscle and base logic.", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
    { level: "MEDIUM", desc: "Combine data structures and spot patterns.", color: "#eab308", bg: "rgba(234,179,8,0.1)" },
    { level: "HARD", desc: "Optimize complexity and edge cases.", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
    { level: "EXPERT", desc: "Compete at the top algorithmic level.", color: "#00e5ff", bg: "rgba(0,229,255,0.1)" }
  ];

  return (
    <section className="w-full py-24 px-6 flex justify-center bg-[#0a0a0f] border-t border-white/5">
      <div className="max-w-5xl w-full flex flex-col items-center">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white uppercase">
            Progress From Easy to Elite
          </h2>
          <p className="text-[#8b8ca7] mt-4 max-w-lg mx-auto">
            Structured problem paths designed to build real problem-solving intuition, step by step.
          </p>
        </div>

        <div className="w-full relative flex flex-col md:flex-row justify-between items-stretch gap-4 md:gap-0 mt-8">
          
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-[40px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-[#22c55e] via-[#eab308] to-[#00e5ff]" />

          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="flex-1 flex flex-col items-center text-center relative z-10"
            >
              {/* Point Node */}
              <div 
                className="w-[80px] h-[80px] rounded-sm flex flex-col items-center justify-center font-bold text-sm tracking-widest border border-white/20 shadow-2xl transition hover:scale-110 mb-6"
                style={{ backgroundColor: step.bg, color: step.color, borderColor: `${step.color}50` }}
              >
                {step.level}
              </div>

              <div className="px-4">
                <p className="text-[#8b8ca7] text-sm leading-relaxed max-w-[200px] mx-auto">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
