"use client";
import { useCursorGlow } from "@/hooks/use-cursor-glow";
import { cn } from "@/lib/utils";

export function CursorGlow() {
  const { position, isHovering } = useCursorGlow();

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300 hidden lg:block mix-blend-screen"
    >
      <div
        className={cn(
          "absolute rounded-full blur-3xl",
          isHovering ? "w-[500px] h-[500px] opacity-25" : "w-[400px] h-[400px] opacity-15"
        )}
        style={{
          background: "var(--glow-color)",
          left: position.x,
          top: position.y,
          transform: "translate(-50%, -50%)",
          transition: "width 0.3s ease, height 0.3s ease, opacity 0.3s ease"
        }}
      />
    </div>
  );
}
