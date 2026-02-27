"use client";

import React, { useEffect, useRef } from "react";

export function HackerBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Grid properties
    const fov = 250;
    const points: { x: number; y: number; z: number }[] = [];
    const gridSize = 20;
    const spacing = 100;

    for (let x = -gridSize; x <= gridSize; x++) {
      for (let z = -gridSize; z <= gridSize; z++) {
        points.push({ x: x * spacing, y: 150, z: z * spacing });
      }
    }

    let time = 0;

    const render = () => {
      ctx.fillStyle = "#05070A"; // Deep cyber black
      ctx.fillRect(0, 0, width, height);

      time += 0.5; // Animation speed

      ctx.save();
      ctx.translate(width / 2, height / 2);

      // Draw horizontal lines
      for (let i = 0; i <= gridSize * 2; i++) {
        let prevPoint: { x: number; y: number } | null = null;
        for (let j = 0; j <= gridSize * 2; j++) {
          const pt = points[i * (gridSize * 2 + 1) + j];
          const movedZ = pt.z - time;
          
          // Wrap around to create infinite scrolling illusion
          const wrappedZ = movedZ < -gridSize * spacing ? movedZ + (gridSize * 2 + 1) * spacing : movedZ;

          // Add a simple wave effect (Matrix/Cyber space bending)
          const waveY = pt.y + Math.sin(pt.x / 200 + time / 20) * 50 + Math.cos(wrappedZ / 200) * 30;

          const scale = fov / (fov + wrappedZ);
          const x2d = pt.x * scale;
          const y2d = waveY * scale;

          if (wrappedZ > -fov + 10) { // Only draw if in front of camera
             if (prevPoint) {
                // Fade out based on distance
                const alpha = Math.max(0, 1 - wrappedZ / (gridSize * spacing));
                ctx.beginPath();
                ctx.moveTo(prevPoint.x, prevPoint.y);
                ctx.lineTo(x2d, y2d);
                ctx.strokeStyle = `rgba(0, 229, 176, ${alpha * 0.4})`; // Neon Cyan
                ctx.lineWidth = 1 * scale;
                ctx.stroke();
             }
             prevPoint = { x: x2d, y: y2d };
          } else {
             prevPoint = null;
          }
        }
      }

      // Draw vertical lines
      for (let j = 0; j <= gridSize * 2; j++) {
        let prevPoint: { x: number; y: number } | null = null;
        for (let i = 0; i <= gridSize * 2; i++) {
          const pt = points[i * (gridSize * 2 + 1) + j];
          const movedZ = pt.z - time;
          const wrappedZ = movedZ < -gridSize * spacing ? movedZ + (gridSize * 2 + 1) * spacing : movedZ;
          const waveY = pt.y + Math.sin(pt.x / 200 + time / 20) * 50 + Math.cos(wrappedZ / 200) * 30;

          const scale = fov / (fov + wrappedZ);
          const x2d = pt.x * scale;
          const y2d = waveY * scale;

          if (wrappedZ > -fov + 10) {
             if (prevPoint) {
                const alpha = Math.max(0, 1 - wrappedZ / (gridSize * spacing));
                ctx.beginPath();
                ctx.moveTo(prevPoint.x, prevPoint.y);
                ctx.lineTo(x2d, y2d);
                ctx.strokeStyle = `rgba(0, 229, 176, ${alpha * 0.4})`;
                ctx.lineWidth = 1 * scale;
                ctx.stroke();
             }
             prevPoint = { x: x2d, y: y2d };
          } else {
             prevPoint = null;
          }
        }
      }

      ctx.restore();
      requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-50 z-0"
      style={{ background: "#05070A" }}
    />
  );
}