import React, { useState } from "react";
import { ErrorBadge } from "./ErrorBadge";
import { HintAccordion } from "./HintAccordion";
import { DiffView } from "./DiffView";
import { AlertTriangle, Terminal, Eye, FileTerminal } from "lucide-react";

export interface ErrorIntelData {
  category: string;
  confidence: number;
  badge: string;
  humanSummary: string;
  pattern?: {
    errorType: string;
    shortExplanation: string;
    probableCause: string;
    severity: string;
  };
  enriched?: {
    diffSummary: string;
    suspicion: string[];
  };
  hints?: {
    level1?: string;
    level2?: string;
    level3?: string;
  };
  raw?: {
    stdout: string;
    stderr: string;
  };
  passedMetadata?: {
    expectedOutput?: string;
    actualOutput?: string;
  };
}

interface ErrorPanelProps {
  data: ErrorIntelData;
}

export function ErrorPanel({ data }: ErrorPanelProps) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="flex flex-col w-full bg-[#0A0F14]/90 backdrop-blur-xl border border-red-500/20 rounded-xl overflow-hidden shadow-2xl relative">
      {/* Top Banner */}
      <div className="flex items-center justify-between px-4 py-3 bg-red-950/40 border-b border-red-900/50">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
          <h3 className="text-sm font-mono font-medium text-gray-200">Aivon Diagnostic System</h3>
        </div>
        <ErrorBadge category={data.category} />
      </div>

      <div className="p-5 flex flex-col space-y-6">
        
        {/* Human Summary */}
        <div className="flex flex-col space-y-2">
           <h4 className="text-xs uppercase tracking-widest text-red-400 font-mono flex items-center">
             <Terminal className="w-3 h-3 mr-2" /> Error Summary
           </h4>
           <p className="text-gray-300 font-sans leading-relaxed text-sm">
             {data.humanSummary}
           </p>
           {data.pattern && data.category !== "WRONG_ANSWER" && (
              <div className="mt-2 text-sm text-orange-200 bg-orange-950/30 p-3 rounded border border-orange-900/40 border-l-2 border-l-orange-500">
                <span className="font-bold mr-2 font-mono">[{data.pattern.errorType}]</span> 
                {data.pattern.probableCause}
              </div>
           )}
           {data.enriched && data.enriched.suspicion && data.enriched.suspicion.length > 0 && (
              <div className="mt-2 text-sm text-yellow-200 bg-yellow-950/30 p-3 rounded border border-yellow-900/40 border-l-2 border-l-yellow-500">
                <ul className="list-disc pl-4 space-y-1">
                   {data.enriched.suspicion.map((susp, idx) => (
                      <li key={idx} className="font-sans">{susp}</li>
                   ))}
                </ul>
              </div>
           )}
        </div>

        {/* Diff View for WA */}
        {data.category === "WRONG_ANSWER" && data.passedMetadata?.expectedOutput !== undefined && (
           <DiffView expected={data.passedMetadata.expectedOutput} actual={data.passedMetadata.actualOutput || ""} />
        )}

        {/* Adaptive Hints */}
        {data.hints && (
           <HintAccordion hints={data.hints} />
        )}

        {/* Raw Logs Toggle */}
        <div className="pt-2">
           <button 
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center text-xs font-mono text-gray-500 hover:text-gray-300 transition-colors"
           >
              {showRaw ? <Eye className="w-3 h-3 mr-1" /> : <FileTerminal className="w-3 h-3 mr-1" />}
              {showRaw ? "Hide Raw Execution Logs" : "View Raw Execution Logs"}
           </button>

           {showRaw && data.raw && (
              <div className="mt-3 bg-black/60 rounded-md border border-gray-800 p-3 overflow-hidden">
                 {data.raw.stdout && (
                    <div className="mb-3">
                       <span className="text-[10px] text-gray-500 uppercase">Stdout</span>
                       <pre className="text-xs text-gray-300 font-mono mt-1 overflow-x-auto">{data.raw.stdout}</pre>
                    </div>
                 )}
                 {data.raw.stderr && (
                    <div>
                       <span className="text-[10px] text-red-900 uppercase">Stderr</span>
                       <pre className="text-xs text-red-400 font-mono mt-1 overflow-x-auto whitespace-pre-wrap">{data.raw.stderr}</pre>
                    </div>
                 )}
              </div>
           )}
        </div>

      </div>
    </div>
  );
}
