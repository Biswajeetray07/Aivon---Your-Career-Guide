"use client";
import { useState, useEffect } from "react";

export function useTypewriter(words: string[], typingSpeed = 100, deletingSpeed = 50, delay = 2000) {
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);

  useEffect(() => {
    const i = loopNum % words.length;
    const fullText = words[i];

    const ticker = setTimeout(() => {
      if (isDeleting) {
        setText(fullText.substring(0, text.length - 1));
      } else {
        setText(fullText.substring(0, text.length + 1));
      }

      if (!isDeleting && text === fullText) {
        setIsDeleting(true);
      } else if (isDeleting && text === "") {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    }, isDeleting ? (text === "" ? 500 : deletingSpeed) : (text === fullText ? delay : typingSpeed));

    return () => clearTimeout(ticker);
  }, [text, isDeleting, loopNum, words, typingSpeed, deletingSpeed, delay]);

  return text;
}
