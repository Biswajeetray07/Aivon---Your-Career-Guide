"use client";

import { motion } from "framer-motion";
import { BrainCircuit, Bug, Lightbulb, GitMerge } from "./lucide";

export function AiAssistantSection() {
  const features = [
    { title: "Intelligent Hint Ladder", icon: <Lightbulb size={20} className="text-yellow-400" />, desc: "Progressive hints that guide your intuition, never giving the answer outright." },
    { title: "Smart Bug Localization", icon: <Bug size={20} className="text-red-400" />, desc: "Highlights the exact logical flaw in your code instead of cryptic generic errors." },
    { title: "Complexity Feedback", icon: <GitMerge size={20} className="text-blue-400" />, desc: "Real-time analysis to tell you if your approach will hit a Time Limit Exceeded." },
    { title: "Explanation Mode", icon: <BrainCircuit size={20} className="text-[#00e5ff]" />, desc: "Deep dive visual explanations of underlying algorithms after you solve it." }
  ];

  return (
    <section className="w-full py-32 px-6 flex justify-center bg-[#050505]">
      <div className="max-w-6xl w-full flex flex-col md:flex-row items-center gap-20">
        
        {/* Left Side: Features List */}
        <div className="flex-1 space-y-12">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white uppercase mb-4">
              Meet Your AI <br/> Coding Partner
            </h2>
            <div className="w-16 h-1 bg-[#00e5ff] mb-6" />
            <p className="text-xl font-bold text-[#00e5ff] uppercase tracking-wider mb-2">
              Built for learning — not spoon-feeding.
            </p>
            <p className="text-[#8b8ca7]">
              Our proprietary model analyzes your unique problem-solving approach to deliver personalized coaching.
            </p>
          </div>

          <div className="space-y-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="mt-1 p-2 bg-[#111118] border border-white/10 shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="text-white font-bold tracking-wide">{feature.title}</h4>
                  <p className="text-sm text-[#8b8ca7] mt-1 pr-6">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Side: Visual Graphic */}
        <div className="flex-1 relative w-full aspect-square md:aspect-auto md:h-[500px] flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full h-full border border-white/5 bg-[#0a0a0f] p-8 flex flex-col justify-between relative shadow-2xl overflow-hidden"
          >
             <div className="absolute top-0 right-0 w-32 h-32 bg-[#00e5ff]/10 blur-[50px] rounded-full point-events-none" />
             
             {/* Mock AI Conversation */}
             <div className="space-y-6 flex-1 flex flex-col justify-center">
               
               <div className="bg-[#111118] border border-white/5 p-4 self-end w-3/4">
                 <p className="text-xs font-mono text-[#8b8ca7]">USER</p>
                 <p className="text-sm text-white mt-1">&quot;Why is my backtracking approach failing on test case 42?&quot;</p>
               </div>

               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: 0.5 }}
                 className="bg-black border border-[#00e5ff]/30 p-4 self-start w-5/6 relative"
               >
                 {/* Accent border */}
                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00e5ff]" />
                 
                 <div className="flex items-center gap-2 mb-2">
                   <BrainCircuit size={14} className="text-[#00e5ff]" />
                   <p className="text-xs font-bold uppercase tracking-widest text-[#00e5ff]">Aivon Assistant</p>
                 </div>
                 <p className="text-sm text-[#f1f0ff] leading-relaxed">
                   Your logic works for positive integers, but Test Case 42 includes negative numbers. Look at line 14: when picking the subset, negatives break your early termination condition. How might you adjust the base case?
                 </p>
                 
               </motion.div>

             </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
