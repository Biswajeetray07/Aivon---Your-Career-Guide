"use client";

import { useEffect, useState } from "react";

export function DarkVeil() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return <div className="fixed inset-0 bg-[#05070A] z-[-2]" />;
  }

  return (
    <div className="fixed inset-0 z-[-2] pointer-events-none overflow-hidden bg-[#05070A]">
      {/* Deep Space Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#110204_0%,#05070A_80%)] opacity-90" />
      
      {/* Subtle Slow Grid */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #FF2A2A 1px, transparent 1px),
            linear-gradient(to bottom, #00C2FF 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px"
        }}
      />
      
      {/* Calm Pulsing Auroras (Spiderman Hacker Dual-Tone) */}
      <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle,rgba(255,42,42,0.04)_0%,transparent_70%)] blur-[120px] mix-blend-screen animate-[pulse_12s_ease-in-out_infinite_alternate]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle,rgba(0,194,255,0.04)_0%,transparent_70%)] blur-[120px] mix-blend-screen animate-[pulse_15s_ease-in-out_infinite_alternate_reverse]" />

      {/* Floating Code Particles / Coder Vibe */}
      <div className="absolute inset-0 opacity-[0.15]">
        <div className="absolute w-px h-1/3 bg-gradient-to-b from-transparent via-[#FF2A2A]/40 to-transparent left-[20%] animate-[scan_10s_linear_infinite]" />
        <div className="absolute w-px h-1/4 bg-gradient-to-b from-transparent via-[#00C2FF]/40 to-transparent left-[60%] animate-[scan_14s_linear_infinite_reverse]" />
        <div className="absolute w-px h-1/2 bg-gradient-to-b from-transparent via-[#FF2A2A]/20 to-transparent left-[85%] animate-[scan_18s_linear_infinite]" />
      </div>

      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }
      `}</style>
    </div>
  );
}
