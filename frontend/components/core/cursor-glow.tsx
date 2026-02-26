"use client";
import { useCursorGlow } from "@/hooks/use-cursor-glow";
import { cn } from "@/lib/utils";

export function CursorGlow() {
  const { position, isHovering } = useCursorGlow();

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999] transition-opacity duration-300 hidden lg:block mix-blend-screen"
    >
      <div
        className="absolute rounded-full blur-[80px] pointer-events-none w-[200px] h-[200px] opacity-15"
        style={{
          background: "radial-gradient(circle, rgba(0, 229, 176, 0.4) 0%, rgba(0, 194, 255, 0.2) 40%, transparent 80%)",
          left: position.x,
          top: position.y,
          transform: "translate(-50%, -50%)",
          transition: "left 0.1s ease-out, top 0.1s ease-out"
        }}
      />
    </div>
  );
}
