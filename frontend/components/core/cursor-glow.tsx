"use client";
import { useCursorGlow } from "@/hooks/use-cursor-glow";

export function CursorGlow() {
  const { elementRef } = useCursorGlow();

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999] transition-opacity duration-300 hidden lg:block mix-blend-screen"
    >
      <div
        ref={elementRef}
        className="absolute rounded-full blur-[80px] pointer-events-none w-[200px] h-[200px] opacity-15"
        style={{
          background: "radial-gradient(circle, rgba(0, 229, 176, 0.4) 0%, rgba(0, 194, 255, 0.2) 40%, transparent 80%)",
          transform: "translate(-50%, -50%)",
          willChange: "left, top",
        }}
      />
    </div>
  );
}
