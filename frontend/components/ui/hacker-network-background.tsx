"use client";
import React, { useRef, useEffect } from "react";

export function HackerNetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Grid properties
    const gridSize = 40;
    const columns = Math.ceil(width / gridSize);
    
    // Matrix Rain properties
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~";
    const drops: number[] = [];
    for (let x = 0; x < columns; x++) {
      drops[x] = Math.random() * -100;
    }

    // Network Node properties — HALVED for performance
    type Node = {
        x: number; y: number; vx: number; vy: number; radius: number; pulse: number; pulseDir: number;
    };

    const createNode = (): Node => {
        const isHorizontal = Math.random() > 0.5;
        const speed = (Math.random() * 0.5 + 0.1) * (Math.random() > 0.5 ? 1 : -1);
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            vx: isHorizontal ? speed : 0,
            vy: isHorizontal ? 0 : speed,
            radius: Math.random() * 1.5 + 0.5,
            pulse: Math.random(),
            pulseDir: Math.random() > 0.5 ? 0.02 : -0.02,
        };
    };

    const updateNode = (node: Node) => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0) node.x = width;
        if (node.x > width) node.x = 0;
        if (node.y < 0) node.y = height;
        if (node.y > height) node.y = 0;
        node.pulse += node.pulseDir;
        if (node.pulse > 1 || node.pulse < 0) node.pulseDir *= -1;
    };

    const nodeCount = Math.floor((width * height) / 50000); // HALVED from 25000
    const nodes: Node[] = [];
    for(let i = 0; i < nodeCount; i++) {
        nodes.push(createNode());
    }

    // 30fps throttle
    let animationFrameId: number;
    let lastFrameTime = 0;
    const FRAME_INTERVAL = 1000 / 30; // 30fps cap

    const animate = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = timestamp - lastFrameTime;
      if (elapsed < FRAME_INTERVAL) return;
      lastFrameTime = timestamp - (elapsed % FRAME_INTERVAL);

      // Semi-transparent black for trailing effect
      ctx.fillStyle = "rgba(5, 7, 10, 0.2)"; 
      ctx.fillRect(0, 0, width, height);

      // SKIP grid drawing — it was barely visible at 0.02 opacity

      // Matrix Rain (Subtle)
      ctx.fillStyle = "rgba(0, 229, 176, 0.15)";
      ctx.font = "10px monospace";
      for (let i = 0; i < drops.length; i++) {
         if (drops[i] > 0) {
             const text = chars.charAt(Math.floor(Math.random() * chars.length));
             ctx.fillText(text, i * gridSize, drops[i] * gridSize);
         }
         if (drops[i] * gridSize > height && Math.random() > 0.975) {
             drops[i] = 0;
         }
         drops[i]++;
      }

      // Network Nodes & Connections — optimized
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        // Only check nearby nodes (reduced connection radius)
        for (let j = i + 1; j < nodes.length; j++) {
            const other = nodes[j];
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const distSq = dx * dx + dy * dy; // Skip sqrt for performance
            
            if (distSq < 22500) { // 150² = 22500
                const distance = Math.sqrt(distSq);
                const isAxisAligned = Math.abs(dx) < 10 || Math.abs(dy) < 10;
                
                ctx.beginPath();
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(other.x, other.y);
                ctx.strokeStyle = isAxisAligned 
                  ? `rgba(0, 194, 255, ${1 - distance / 150})`
                  : `rgba(0, 194, 255, ${(1 - distance / 150) * 0.2})`;
                ctx.stroke();
            }
        }

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * (1 + (node.pulse * 0.5)), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 194, 255, ${0.5 + node.pulse * 0.5})`;
        ctx.fill();
        
        updateNode(node);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full object-cover z-[-1]"
      style={{ background: "#05070A", willChange: "transform" }}
    />
  );
}