"use client";

import { useEffect, useRef } from "react";

interface SpiderWebProps {
  variant?: "default" | "green";
}

export function SpiderWebBackground({ variant = "default" }: SpiderWebProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", handleResize);

    // Spider-web / Neural Network Nodes
    const numNodes = Math.min(100, (width * height) / 10000);
    const nodes: { x: number; y: number; vx: number; vy: number; radius: number; colorType: "primary" | "secondary" | "accent" }[] = [];

    const colors = variant === "green" 
      ? {
          primary: "#00E5B0", // Neon Green
          secondary: "#00C2FF", // Cyber Blue
          accent: "#0F1E38" // Deep Cobalt
        }
      : {
          primary: "#FF2A2A", // Crimson Red
          secondary: "#00E5B0", // Neon Cyan
          accent: "#0F1E38" // Deep Cobalt
        };

    // For rendering webs, determine which colors dominate
    const primaryStr = variant === "green" ? "0, 229, 176" : "255, 42, 42";
    const secondaryStr = variant === "green" ? "0, 194, 255" : "0, 229, 176";

    for (let i = 0; i < numNodes; i++) {
        const typeRand = Math.random();
        const colorType = typeRand > 0.8 ? "primary" : (typeRand > 0.5 ? "secondary" : "accent");
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          radius: Math.random() * 2 + 1,
          colorType
        });
      }

    const maxDistance = 150;

    let animationFrameId: number;

    const render = () => {
      // Clear with deep void black and slight opacity for trailing effect
      ctx.fillStyle = "rgba(5, 7, 10, 0.3)";
      ctx.fillRect(0, 0, width, height);

      // Update and draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Move
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off walls
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Draw connections (Webs)
        for (let j = i + 1; j < nodes.length; j++) {
          const target = nodes[j];
          const dx = target.x - node.x;
          const dy = target.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const opacity = 1 - (dist / maxDistance);
            
            // Web lines
            let lineColor = `rgba(15, 30, 56, ${opacity * 0.5})`; // Deep Cobalt Blue base
            if (node.colorType === "primary" || target.colorType === "primary") {
              lineColor = `rgba(${primaryStr}, ${opacity * 0.4})`;
            } else if (node.colorType === "secondary" && target.colorType === "secondary") {
              lineColor = `rgba(${secondaryStr}, ${opacity * 0.6})`;
            }

            ctx.beginPath();
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = opacity * 1.5;
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
          }
        }

        // Draw Node
        ctx.beginPath();
        const baseColor = colors[node.colorType];
        
        // Add glow to primary and secondary nodes
        if (node.colorType !== "accent") {
           ctx.shadowBlur = 10;
           ctx.shadowColor = baseColor;
        } else {
           ctx.shadowBlur = 0;
        }
        
        ctx.fillStyle = baseColor;
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      }

      // Draw random glitch horizontal scanner line (green or red based on variant)
      if (Math.random() > 0.95) {
        const y = Math.random() * height;
        ctx.fillStyle = variant === "green" ? "rgba(0, 229, 176, 0.05)" : "rgba(255, 42, 42, 0.05)";
        ctx.fillRect(0, y, width, Math.random() * 5 + 1);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ background: "#05070A" }}
    />
  );
}
