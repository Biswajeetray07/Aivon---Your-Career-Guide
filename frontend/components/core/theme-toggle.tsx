"use client";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return (
    <div className="p-2 h-8 w-8" />
  );

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg hover:bg-white/5 transition-colors focus:outline-none"
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 hidden dark:block text-[var(--muted)] hover:text-[var(--primary)] transition-colors" />
      <Moon className="h-4 w-4 dark:hidden text-[var(--muted)] hover:text-[var(--primary)] transition-colors" />
    </button>
  );
}
