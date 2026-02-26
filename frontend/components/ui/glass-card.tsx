import { cn } from "@/lib/utils";
import React from "react";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverLift?: boolean;
}

export function GlassCard({ className, hoverLift, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass shadow-hacker-glow rounded-2xl relative overflow-hidden",
        hoverLift && "hover-lift",
        className
      )}
      {...props}
    />
  );
}
