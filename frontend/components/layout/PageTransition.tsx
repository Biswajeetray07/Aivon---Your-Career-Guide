"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // The landing page and onboarding might have radical backgrounds, 
  // so we use a gentle fade and slight scale-up for depth.
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 1.02, filter: "blur(4px)" }}
        transition={{ 
          duration: 0.24, 
          ease: [0.22, 1, 0.36, 1] // Custom refined spring-like ease out
        }}
        style={{ width: "100%", height: "100%", originY: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
