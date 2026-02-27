import React from "react";

interface DiffViewProps {
  expected: string;
  actual: string;
}

export function DiffView({ expected, actual }: DiffViewProps) {
  // A simple split view for now. Real diffing would highlight per-character mismatches.
  // The Backend WA Analyzer provides diffSignals which could be used here for advanced highlighting later.
  
  return (
    <div className="mt-4 flex flex-col space-y-3">
       <div className="text-xs font-mono text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-1">
          Output Comparison
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col bg-red-950/20 rounded-md border border-red-900/30 overflow-hidden">
             <div className="bg-red-900/40 px-3 py-1 text-xs font-mono text-red-200 flex items-center justify-between">
                <span>Received (Your Output)</span>
                <span className="text-[10px] opactiy-50">-</span>
             </div>
             <pre className="p-3 text-sm text-red-100 font-mono whitespace-pre-wrap overflow-x-auto max-h-48 scrollbar-thin scrollbar-thumb-red-900/50">
                {actual || "(no output)"}
             </pre>
          </div>
          
          <div className="flex flex-col bg-emerald-950/20 rounded-md border border-emerald-900/30 overflow-hidden">
             <div className="bg-emerald-900/40 px-3 py-1 text-xs font-mono text-emerald-200 flex items-center justify-between">
                <span>Expected Output</span>
                <span className="text-[10px] opactiy-50">+</span>
             </div>
             <pre className="p-3 text-sm text-emerald-100 font-mono whitespace-pre-wrap overflow-x-auto max-h-48 scrollbar-thin scrollbar-thumb-emerald-900/50">
                {expected || "(empty)"}
             </pre>
          </div>
       </div>
    </div>
  );
}
