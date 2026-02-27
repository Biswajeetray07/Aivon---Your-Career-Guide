"use client";
import React, { useRef, useEffect } from "react";

export function NeonSpiderWebBackground() {
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

    // Node particle system for the web
    type Node = {
      x: number; y: number; vx: number; vy: number; radius: number; color: string; baseX: number; baseY: number;
    };

    const createNode = (x: number, y: number): Node => {
        return {
          x, y, baseX: x, baseY: y,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 1.5 + 0.5,
          color: Math.random() > 0.85 ? "#00C2FF" : "#00E5B0",
        };
    };

    const updateNode = (node: Node, mouseX: number, mouseY: number) => {
        node.x += node.vx;
        node.y += node.vy;

        // Gentle boundary drift and wrap
        if (node.x < -100) node.x = width + 100;
        if (node.x > width + 100) node.x = -100;
        if (node.y < -100) node.y = height + 100;
        if (node.y > height + 100) node.y = -100;

        // Central cursor pull logic
        const dx = mouseX - node.x;
        const dy = mouseY - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // If mouse is close, nodes naturally pull towards it slightly
        if (mouseX !== -1000 && dist < 300) {
          const force = (300 - dist) / 300;
          node.x += dx * force * 0.02;
          node.y += dy * force * 0.02;
        } else {
          // Slow return to base trajectory
          node.x += (node.baseX - node.x) * 0.001;
          node.y += (node.baseY - node.y) * 0.001;
        }
    };

    const drawNode = (node: Node, ctx: CanvasRenderingContext2D) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        
        // Add strong glow to nodes
        ctx.shadowBlur = 10;
        ctx.shadowColor = node.color;
        ctx.fill();
        
        // Reset shadow for performance on lines
        ctx.shadowBlur = 0;
    };

    // Initialize nodes
    const nodes: Node[] = [];
    const nodeCount = Math.floor((width * height) / 12000); // Dense but performant
    
    for (let i = 0; i < nodeCount; i++) {
        // Distribute nodes roughly around the center, radiating outward to form a "web"
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * (Math.max(width, height) / 1.5);
        const x = width / 2 + Math.cos(angle) * radius;
        const y = height / 2 + Math.sin(angle) * radius;
        nodes.push(createNode(x, y));
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
      ctx.clearRect(0, 0, width, height);
      
      // Draw dark background directly to avoid relying entirely on css
      ctx.fillStyle = "#05070A"; // Deep void green-black
      ctx.fillRect(0, 0, width, height);

      // Draw abstract radial grid behind the nodes 
      ctx.strokeStyle = "rgba(0, 229, 176, 0.03)";
      ctx.lineWidth = 1;
      const centerX = width / 2;
      const centerY = height / 2;
      
      for(let r = 50; r < Math.max(width, height); r += 100) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
          ctx.stroke();
      }

      // Update and Draw Nodes
      nodes.forEach(node => {
        updateNode(node, mouse.x, mouse.y);
        drawNode(node, ctx);
      });

      // Draw Spiderman "Webs" (Curved Bezier lines between close nodes)
      ctx.lineWidth = 0.8;
      
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            // Determine line opacity based on distance
            const opacity = 1 - distance / 150;
            
            // If one of the nodes is Cobalt Blue, tint the web blue, else Green
            const isBlue = nodes[i].color === "#00C2FF" || nodes[j].color === "#00C2FF";
            
            if (isBlue) {
               ctx.strokeStyle = `rgba(0, 194, 255, ${opacity * 0.4})`;
            } else {
               ctx.strokeStyle = `rgba(0, 229, 176, ${opacity * 0.5})`;
            }

            // Draw curved "web" lines using quadratic curves
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            
            // Add a slight arc to the line to make it look like a tense web thread
            const midX = (nodes[i].x + nodes[j].x) / 2;
            const midY = (nodes[i].y + nodes[j].y) / 2;
            const cpX = midX + (Math.random() - 0.5) * 20; 
            const cpY = midY + (Math.random() - 0.5) * 20;
            
            ctx.quadraticCurveTo(cpX, cpY, nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw laser beams connecting cursor to nearby nodes (Hacker interaction)
      if (mouse.x !== -1000) {
          nodes.forEach(node => {
              const dx = mouse.x - node.x;
              const dy = mouse.y - node.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance < 200) {
                  const opacity = 1 - (distance / 200);
                  
                  ctx.beginPath();
                  ctx.moveTo(mouse.x, mouse.y);
                  ctx.lineTo(node.x, node.y);
                  
                  // Intense neon green cursor laser
                  ctx.strokeStyle = `rgba(0, 229, 176, ${opacity * 0.8})`;
                  ctx.lineWidth = 1.5;
                  
                  // Add glow to laser
                  ctx.shadowBlur = 15;
                  ctx.shadowColor = "#00E5B0";
                  
                  ctx.stroke();
                  ctx.shadowBlur = 0; // reset
              }
          })
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
      className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
      style={{ background: "#05070A" }} // Fallback background
    />
  );
}