import React, { useState } from "react";
import { ChevronDown, ChevronRight, Lightbulb } from "lucide-react";

interface HintAccordionProps {
  hints: {
    level1?: string;
    level2?: string;
    level3?: string;
  };
}

export function HintAccordion({ hints }: HintAccordionProps) {
  const [openLevel, setOpenLevel] = useState<number | null>(null);

  const toggleLevel = (level: number) => {
    if (openLevel === level) {
      setOpenLevel(null);
    } else {
      setOpenLevel(level);
    }
  };

  const hintItems = [
    { level: 1, label: "Gentle Nudge", content: hints.level1 },
    { level: 2, label: "Directional Hint", content: hints.level2 },
    { level: 3, label: "Strong Hint", content: hints.level3 },
  ].filter(h => h.content);

  if (hintItems.length === 0) return null;

  return (
    <div className="flex flex-col space-y-2 mt-4">
      <div className="flex items-center space-x-2 text-sm text-cyan-400 font-mono mb-1">
        <Lightbulb className="w-4 h-4" />
        <span>Adaptive Hints Available</span>
      </div>
      {hintItems.map((hint) => {
        const isOpen = openLevel === hint.level;
        // Require opening them in order ideally, but for now just progressive UI interaction
        const isLocked = hint.level > 1 && (openLevel === null || openLevel < hint.level - 1);

        return (
           <div 
             key={hint.level} 
             className="rounded-md border border-cyan-900/40 bg-black/40 overflow-hidden"
           >
              <button
                onClick={() => !isLocked && toggleLevel(hint.level)}
                className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
                    isLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-cyan-900/20"
                }`}
              >
                 <span className={`font-mono text-xs ${isOpen ? "text-cyan-300" : "text-gray-400"}`}>
                   [{hint.level}] {hint.label} {isLocked && "(Locked)"}
                 </span>
                 {isOpen ? <ChevronDown className="w-4 h-4 text-cyan-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
              </button>
              {isOpen && !isLocked && (
                  <div className="p-3 pt-0 text-sm text-gray-300 font-sans leading-relaxed border-t border-cyan-900/30">
                     {hint.content}
                  </div>
              )}
           </div>
        );
      })}
    </div>
  );
}
