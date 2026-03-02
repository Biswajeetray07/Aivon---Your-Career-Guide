import { Shield } from "lucide-react";

export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen pt-[120px] pb-20 w-full max-w-[1500px] mx-auto px-6 md:px-12 font-space-grotesk flex flex-col items-center relative z-10 bg-transparent">
        
        {/* Header Skeleton */}
        <div className="w-full mb-12 flex flex-col xl:flex-row gap-8 items-stretch relative z-10 animate-pulse">
          <div className="flex-1 border-[0.5px] border-white/5 bg-[#060D10]/80 rounded-xl overflow-hidden shadow-hacker-glow relative flex flex-col h-32" />
        </div>

        {/* Title Skeleton */}
        <div className="w-full mb-12 flex flex-col gap-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6 w-full animate-pulse">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <Shield className="w-8 h-8 md:w-10 md:h-10 text-white/10" />
                <div className="h-10 w-64 bg-white/10 rounded" />
              </div>
              <div className="h-4 w-48 bg-white/5 rounded mt-3" />
            </div>
            <div className="h-4 w-32 bg-white/5 rounded" />
          </div>
        </div>

        {/* Directory Matrix Grid Skeleton */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex flex-col bg-[#060D10]/80 border-[0.5px] border-white/5 rounded-xl overflow-hidden relative group animate-pulse h-48" />
          ))}
        </div>
    </div>
  );
}
