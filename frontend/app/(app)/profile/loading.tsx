import { ShieldAlert, Cpu, Activity } from "lucide-react";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen pt-[120px] pb-20 w-full max-w-[1200px] mx-auto px-6 md:px-12 font-space-grotesk flex flex-col items-center relative z-10 bg-transparent">
        
      {/* Target Designation Header Skeleton */}
      <div className="w-full flex items-center justify-between mb-8 border-b border-white/10 pb-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-white/20" />
          </div>
          <div>
            <div className="h-2 w-24 bg-[#00E5B0]/20 rounded mb-2" />
            <div className="h-6 w-48 bg-white/10 rounded" />
          </div>
        </div>
        <div className="hidden md:flex flex-col items-end">
          <div className="h-2 w-16 bg-[#00C2FF]/20 rounded mb-2" />
          <div className="h-8 w-24 bg-white/5 rounded" />
        </div>
      </div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 animate-pulse">
        {/* Main Telemetry Skeleton */}
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
               {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-[#060D10]/80 border-[0.5px] border-white/5 rounded-xl h-24" />
               ))}
            </div>

            {/* Runtime Chart Skeleton */}
            <div className="bg-[#060D10]/80 border-[0.5px] border-white/5 rounded-xl h-64 flex flex-col p-6">
                <div className="h-6 w-48 bg-white/5 rounded mb-6" />
                <div className="flex-1 border-b border-l border-white/10 relative">
                   {/* Fake grid lines */}
                   <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />
                </div>
            </div>

            {/* Activity History Skeleton */}
            <div className="bg-[#0A0F14]/60 border border-white/5 rounded-xl p-6 flex flex-col gap-4">
                 <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                     <Activity className="w-5 h-5 text-[#00E5B0]/30" />
                     <div className="h-5 w-40 bg-white/5 rounded" />
                 </div>
                 <div className="space-y-3 mt-4">
                     {[1, 2, 3, 4, 5].map(i => (
                         <div key={i} className="h-16 w-full bg-white/5 rounded-md" />
                     ))}
                 </div>
            </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-8">
            {/* Identity Array */}
            <div className="bg-[#060D10]/80 border-[0.5px] border-white/5 rounded-xl flex flex-col p-6 items-center">
                 <div className="w-24 h-24 rounded-full bg-white/5 mb-6" />
                 <div className="h-6 w-32 bg-white/10 rounded mb-2" />
                 <div className="h-4 w-40 bg-white/5 rounded" />
                 <div className="w-full h-[1px] bg-white/10 my-6" />
                 <div className="w-full space-y-3">
                     <div className="h-8 w-full bg-white/5 rounded" />
                     <div className="h-8 w-full bg-white/5 rounded" />
                     <div className="h-8 w-full bg-white/5 rounded" />
                 </div>
            </div>

            {/* Hardware Profile */}
            <div className="bg-[#060D10]/80 border-[0.5px] border-white/5 rounded-xl p-6 space-y-6">
                 <div className="flex items-center gap-3">
                     <Cpu className="w-5 h-5 text-white/20" />
                     <div className="h-4 w-32 bg-white/10 rounded" />
                 </div>
                 <div className="h-32 w-32 rounded-full bg-white/5 mx-auto" />
            </div>
        </div>
      </div>
    </div>
  );
}
