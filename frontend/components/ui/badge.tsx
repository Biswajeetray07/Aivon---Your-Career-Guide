import { cn } from "@/lib/utils";
import React from "react";

export function Badge({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "success" | "warning" | "danger" }) {
  const variants = {
    default: "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20",
    success: "bg-green-500/10 text-green-400 border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    danger: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border", variants[variant], className)}>
      {children}
    </span>
  );
}

export function StatusDot({ animate = false, colorClass = "bg-[var(--primary)]" }: { animate?: boolean, colorClass?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      {animate && <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", colorClass)}></span>}
      <span className={cn("relative inline-flex rounded-full h-2 w-2", colorClass)}></span>
    </span>
  );
}
