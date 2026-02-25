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
    const rows = Math.ceil(height / gridSize);
    
    // Matrix Rain properties
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~";
    const drops: number[] = [];
    for (let x = 0; x < columns; x++) {
      drops[x] = Math.random() * -100; // Start at random negative heights
    }

    // Network Node properties
    class Node {
        x: number;
        y: number;
        vx: number;
        vy: number;
        radius: number;
        connections: number[];
        pulse: number;
        pulseDir: number;

        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            // Strict linear movement (horizontal or vertical, not diagonal)
            const isHorizontal = Math.random() > 0.5;
            const speed = (Math.random() * 0.5 + 0.1) * (Math.random() > 0.5 ? 1 : -1);
            
            this.vx = isHorizontal ? speed : 0;
            this.vy = isHorizontal ? 0 : speed;
            
            this.radius = Math.random() * 1.5 + 0.5;
            this.connections = [];
            
            this.pulse = Math.random();
            this.pulseDir = Math.random() > 0.5 ? 0.02 : -0.02;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Wrap around
            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;
            
            // Pulse effect
            this.pulse += this.pulseDir;
            if (this.pulse > 1 || this.pulse < 0) this.pulseDir *= -1;
            
            // Mouse repel
            if (mouse.x !== -1000) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    this.x -= (dx / dist) * 2;
                    this.y -= (dy / dist) * 2;
                }
            }
        }
    }

    const nodes: Node[] = [];
    // Lower node count than spider web for cleaner "data flow" feel
    const nodeCount = Math.floor((width * height) / 25000); 
    for(let i=0; i<nodeCount; i++) {
        nodes.push(new Node());
    }

    // Mouse interaction
    const mouse = { x: -1000, y: -1000 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseOut = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseOut);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      // Semi-transparent black to create trailing effects
      ctx.fillStyle = "rgba(5, 7, 10, 0.2)"; 
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Static Grid Overlay (very faint)
      ctx.strokeStyle = "rgba(0, 229, 176, 0.02)";
      ctx.lineWidth = 1;
      
      // Horizontal lines
      for (let y = 0; y <= height; y += gridSize) {
         ctx.beginPath();
         ctx.moveTo(0, y);
         ctx.lineTo(width, y);
         ctx.stroke();
      }
      // Vertical lines
      for (let x = 0; x <= width; x += gridSize) {
         ctx.beginPath();
         ctx.moveTo(x, 0);
         ctx.lineTo(x, height);
         ctx.stroke();
      }

      // 2. Draw Matrix Rain (Subtle)
      ctx.fillStyle = "rgba(0, 229, 176, 0.15)";
      ctx.font = "10px monospace";
      for (let i = 0; i < drops.length; i++) {
         if (drops[i] > 0) {
             const text = chars.charAt(Math.floor(Math.random() * chars.length));
             ctx.fillText(text, i * gridSize, drops[i] * gridSize);
         }
         
         // Sending the drop back to the top randomly
         if (drops[i] * gridSize > height && Math.random() > 0.975) {
             drops[i] = 0;
         }
         drops[i]++;
      }

      // 3. Draw Network Nodes & Data Streams
      nodes.forEach(node => node.update());
      
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
          // Draw Node
          ctx.beginPath();
          ctx.arc(nodes[i].x, nodes[i].y, nodes[i].radius, 0, Math.PI * 2);
          
          // Pulsing opacity
          const opacity = 0.3 + (nodes[i].pulse * 0.7);
          ctx.fillStyle = `rgba(0, 229, 176, ${opacity})`;
          ctx.fill();

          // Draw Connections (Data Streams)
          for (let j = i + 1; j < nodes.length; j++) {
              const dx = nodes[i].x - nodes[j].x;
              const dy = nodes[i].y - nodes[j].y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              // Connect nodes that are close
              if (distance < 150) {
                  // Only draw purely horizontal or vertical connections to look like a circuit board
                  const isStrictlyHorizontal = Math.abs(dy) < 5;
                  const isStrictlyVertical = Math.abs(dx) < 5;
                  
                  // Allow diagonal connections if they are very close
                  const isCloseDiagonal = distance < 80;

                  if (isStrictlyHorizontal || isStrictlyVertical || isCloseDiagonal) {
                      ctx.beginPath();
                      ctx.moveTo(nodes[i].x, nodes[i].y);
                      
                      if (isCloseDiagonal && !isStrictlyHorizontal && !isStrictlyVertical) {
                          // Draw a circuit-like right-angle connection instead of a straight line
                          ctx.lineTo(nodes[i].x, nodes[j].y);
                      }
                      
                      ctx.lineTo(nodes[j].x, nodes[j].y);
                      
                      // Connection opacity
          ctx.strokeStyle = `rgba(0, 229, 176, ${(1 - distance / 150) * 0.3})`;
                      ctx.stroke();
                  }
              }
          }
      }

      // 4. Cursor Interaction Ring
      if (mouse.x !== -1000) {
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 40, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(0, 194, 255, 0.2)"; // Cobalt accent
          ctx.lineWidth = 1;
          
          // Outer targeting ring
          ctx.moveTo(mouse.x - 50, mouse.y);
          ctx.lineTo(mouse.x - 30, mouse.y);
          ctx.moveTo(mouse.x + 50, mouse.y);
          ctx.lineTo(mouse.x + 30, mouse.y);
          ctx.moveTo(mouse.x, mouse.y - 50);
          ctx.lineTo(mouse.x, mouse.y - 30);
          ctx.moveTo(mouse.x, mouse.y + 50);
          ctx.lineTo(mouse.x, mouse.y + 30);
          
          ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full object-cover z-[-1]"
      style={{ background: "#05070A" }}
    />
  );
}
