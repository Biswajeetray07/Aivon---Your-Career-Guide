"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface TypewriterProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
}

export function Typewriter({ text, speed = 40, delay = 0, className = "" }: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const startTyping = () => {
      let currentIndex = 0;
      
      const type = () => {
        if (currentIndex <= text.length) {
          setDisplayedText(text.slice(0, currentIndex));
          currentIndex++;
          timeoutId = setTimeout(type, speed);
        } else {
          setIsComplete(true);
        }
      };
      
      type();
    };

    const initialDelayId = setTimeout(startTyping, delay);

    return () => {
      clearTimeout(initialDelayId);
      clearTimeout(timeoutId);
    };
  }, [text, speed, delay]);

  return (
    <div className={`flex items-center ${className}`}>
      <span>{displayedText}</span>
      <motion.span
        animate={{ opacity: [1, 1, 0, 0] }}
        transition={{ 
          duration: 1, 
          repeat: Infinity, 
          times: [0, 0.5, 0.51, 1]
        }}
        className="w-[2px] h-[1em] bg-[#00E5B0] ml-1 inline-block shadow-[0_0_8px_#00E5B0]"
      />
    </div>
  );
}
