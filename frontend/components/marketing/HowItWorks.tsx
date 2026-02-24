"use client";

import { motion } from "framer-motion";

export function HowItWorks() {
  const steps = [
    { num: "01", title: "Pick a Problem", text: "Select from curated lists." },
    { num: "02", title: "Write & Execute", text: "Submit against robust test cases." },
    { num: "03", title: "Instant Feedback", text: "Review AI insights and improve." }
  ];

  return (
    <section className="w-full py-24 px-6 flex justify-center bg-[#050505]">
      <div className="max-w-6xl w-full">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white uppercase border-l-4 border-[#00e5ff] pl-6">
            Execution Flow
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full border-t border-white/10 pt-8" >
          {steps.map((s, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="flex flex-col gap-4 p-6"
            >
              <span className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white/20 to-transparent block mb-4">
                {s.num}
              </span>
              <h3 className="text-xl font-bold text-white tracking-widest uppercase">
                {s.title}
              </h3>
              <p className="text-[#8b8ca7]">{s.text}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
