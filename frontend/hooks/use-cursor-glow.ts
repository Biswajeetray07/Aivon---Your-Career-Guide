"use client";
import { useEffect, useRef, useCallback } from "react";

export function useCursorGlow() {
  const posRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  const updateDOM = useCallback(() => {
    if (elementRef.current) {
      elementRef.current.style.left = `${posRef.current.x}px`;
      elementRef.current.style.top = `${posRef.current.y}px`;
    }
    rafRef.current = null;
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      posRef.current.x = e.clientX;
      posRef.current.y = e.clientY;
      // Batch DOM updates with rAF — no React re-renders
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(updateDOM);
      }
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateDOM]);

  return { elementRef, position: posRef };
}
