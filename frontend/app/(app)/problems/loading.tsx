import { GlassCard } from "@/components/ui/glass-card";

export default function ProblemsLoading() {
  return (
    <div className="min-h-screen pt-[120px] pb-20 w-full max-w-[1500px] mx-auto px-6 md:px-12 font-space-grotesk flex flex-col items-center relative z-10 bg-transparent">
      {/* HUD Header Skeleton */}
      <div className="w-full mb-12 flex flex-col xl:flex-row gap-8 items-stretch relative z-10 animate-pulse">
        <div className="flex-1 border-[0.5px] border-white/5 bg-[#060D10]/80 rounded-xl overflow-hidden h-32" />
        <div className="w-full xl:w-[450px] border-[0.5px] border-white/5 bg-[#060D10]/80 rounded-lg p-6 flex flex-col justify-center h-32" />
      </div>

      <div className="w-full flex flex-col xl:flex-row gap-8 items-start relative z-10">
        {/* Network Filtering System Skeleton */}
        <div className="w-full xl:w-[320px] shrink-0 sticky top-[100px] space-y-6 animate-pulse">
          <div className="w-full h-12 bg-white/5 rounded-lg border border-white/10" />
          <div className="w-full h-48 bg-white/5 rounded-lg border border-white/10" />
          <div className="w-full h-48 bg-white/5 rounded-lg border border-white/10" />
        </div>

        {/* Database Readout Skeleton */}
        <div className="flex-1 w-full space-y-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <GlassCard key={i} className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-l-2 border-transparent bg-[#0A0F14]/60 overflow-hidden relative group animate-pulse">
               <div className="flex items-center gap-5 flex-1 min-w-0">
                 <div className="w-10 h-10 rounded-md bg-white/5 shrink-0" />
                 <div className="space-y-3 flex-1">
                   <div className="h-5 w-48 bg-white/10 rounded" />
                   <div className="h-3 w-32 bg-white/5 rounded" />
                 </div>
               </div>
               <div className="flex items-center gap-6 shrink-0 lg:w-48 justify-end">
                   <div className="h-8 w-24 bg-white/5 rounded-full" />
                   <div className="h-8 w-8 bg-white/5 rounded" />
               </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
