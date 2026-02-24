"use client";

import { motion } from "framer-motion";
import { Zap, Bot, TrendingUp } from "./lucide";

const cards = [
  {
    icon: <Zap size={24} className="text-[#00e5ff]" />,
    title: "Blazing-Fast Judge",
    desc: "Get precise verdicts with a production-grade execution engine designed for reliability and speed."
  },
  {
    icon: <Bot size={24} className="text-[#00e5ff]" />,
    title: "AI That Actually Helps",
    desc: "Receive intelligent hints, bug detection, and step-by-step guidance — not generic suggestions."
  },
  {
    icon: <TrendingUp size={24} className="text-[#00e5ff]" />,
    title: "Growth That You Can Measure",
    desc: "Track difficulty progression, solve streaks, and performance analytics in one unified dashboard."
  }
];

export function WhyAivonSection() {
  return (
    <section className="w-full py-32 px-6 flex justify-center bg-[#050505]">
      <div className="max-w-6xl w-full flex flex-col items-center">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white uppercase">
            Why Developers Choose Aivon
          </h2>
          <div className="w-24 h-1 bg-[#00e5ff] mt-6 mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {cards.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="group relative bg-[#0a0a0f] border border-white/10 p-8 flex flex-col transition-all hover:border-[#00e5ff]/50 hover:bg-[#0a0a0f]/80"
            >
              {/* Sharp corner accent */}
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#00e5ff] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[#00e5ff] opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="mb-6 p-4 bg-black inline-flex border border-white/5 w-fit">
                {card.icon}
              </div>
              
              <h3 className="text-xl font-bold text-white mb-3 tracking-wide">
                {card.title}
              </h3>
              
              <p className="text-[#8b8ca7] leading-relaxed text-sm">
                {card.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
