"use client";

import { motion } from "framer-motion";
import { ShieldCheck, DatabaseZap, CodeSquare, Server } from "./lucide";

export function TrustSection() {
  const items = [
    { icon: <ShieldCheck size={20} className="text-[#00e5ff]" />, text: "Secure Sandbox Execution" },
    { icon: <DatabaseZap size={20} className="text-[#00e5ff]" />, text: "Precise Test Validation" },
    { icon: <Server size={20} className="text-[#00e5ff]" />, text: "Scalable Judge Architecture" },
    { icon: <CodeSquare size={20} className="text-[#00e5ff]" />, text: "Developer-First Design" }
  ];

  return (
    <section className="w-full py-24 px-6 flex justify-center bg-[#0a0a0f]">
      <div className="max-w-4xl w-full flex flex-col items-center">
        
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white uppercase flex items-center justify-center gap-4">
            Built Like a Real <br className="md:hidden" /> Engineering System
          </h2>
          <div className="w-16 h-1 bg-[#8b8ca7]/30 mt-6 mx-auto" />
        </div>

        <div className="flex flex-wrap justify-center gap-4 md:gap-8 mt-8">
          {items.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="flex items-center gap-3 bg-black border border-white/10 px-6 py-4 rounded-none"
            >
              {item.icon}
              <span className="text-[#f1f0ff] font-medium tracking-wide text-sm">{item.text}</span>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
