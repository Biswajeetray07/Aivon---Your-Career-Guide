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
    type Node = {
        x: number; y: number; vx: number; vy: number; radius: number; connections: number[]; pulse: number; pulseDir: number;
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
            connections: [],
            pulse: Math.random(),
            pulseDir: Math.random() > 0.5 ? 0.02 : -0.02,
        };
    };

    const updateNode = (node: Node, mouseX: number, mouseY: number) => {
        node.x += node.vx;
        node.y += node.vy;

        // Wrap around
        if (node.x < 0) node.x = width;
        if (node.x > width) node.x = 0;
        if (node.y < 0) node.y = height;
        if (node.y > height) node.y = 0;
        
        // Pulse effect
        node.pulse += node.pulseDir;
        if (node.pulse > 1 || node.pulse < 0) node.pulseDir *= -1;
        
        // Mouse repel
        if (mouseX !== -1000) {
            const dx = mouseX - node.x;
            const dy = mouseY - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
                node.x -= (dx / dist) * 2;
                node.y -= (dy / dist) * 2;
            }
        }
    };

    const nodes: Node[] = [];
    // Lower node count than spider web for cleaner "data flow" feel
    const nodeCount = Math.floor((width * height) / 25000); 
    for(let i=0; i<nodeCount; i++) {
        nodes.push(createNode());
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
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        // Update connections (recalculate each frame for dynamic connections)
        node.connections = [];
        for (let j = i + 1; j < nodes.length; j++) {
            const other = nodes[j];
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 150) { // Connect nodes that are close
                node.connections.push(j);
                
                // Line opacity based on strict axis alignment (optional hacker style)
                const isAxisAligned = Math.abs(dx) < 10 || Math.abs(dy) < 10;
                
                // Draw connecting line
                ctx.beginPath();
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(other.x, other.y);
                if (isAxisAligned) {
                  ctx.strokeStyle = `rgba(0, 194, 255, ${1 - distance / 150})`; // Bright cyan for straight lines
                } else {
                  ctx.strokeStyle = `rgba(0, 194, 255, ${(1 - distance / 150) * 0.2})`; // Faint cyan for diagonals
                }
                ctx.stroke();
            }
        }

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * (1 + (node.pulse * 0.5)), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 194, 255, ${0.5 + node.pulse * 0.5})`; // Spiderman Hacker Cyan Glow
        ctx.fill();
        
        // Move node
        updateNode(node, mouse.x, mouse.y);
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
