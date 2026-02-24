"use client";

import { HeroSection } from "@/components/marketing/HeroSection";
import { WhyAivonSection } from "@/components/marketing/WhyAivonSection";
import { JudgePreviewSection } from "@/components/marketing/JudgePreviewSection";
import { AiAssistantSection } from "@/components/marketing/AiAssistantSection";
import { DifficultyLadder } from "@/components/marketing/DifficultyLadder";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { TrustSection } from "@/components/marketing/TrustSection";
import { FinalCTA } from "@/components/marketing/FinalCTA"

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#f1f0ff] font-sans overflow-hidden selection:bg-[#00e5ff] selection:text-black">
      {/* Absolute grid background for technical feel */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '32px 32px'
      }} />
      
      <main className="relative z-10 flex flex-col items-center">
        <HeroSection />
        <WhyAivonSection />
        <JudgePreviewSection />
        <AiAssistantSection />
        <DifficultyLadder />
        <HowItWorks />
        <TrustSection />
        <FinalCTA />
      </main>
    </div>
  );
}
