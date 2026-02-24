import Link from "next/link";
import { type Problem } from "@/lib/api";

export default function RoadmapView({ problems }: { problems: Problem[] }) {
  if (!problems.length) return null;

  return (
    <div style={{
      position: "relative",
      padding: "40px 0",
      minHeight: "800px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      overflow: "hidden"
    }}>
      {/* Dynamic SVG connecting lines */}
      <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}>
        <defs>
          <linearGradient id="glowG" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8A2BE2" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00FFFF" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {problems.map((p, i) => {
          if (i === problems.length - 1) return null;
          const isLeft1 = i % 2 === 0;
          const isLeft2 = (i + 1) % 2 === 0;
          
          const x1 = isLeft1 ? "30%" : "70%";
          const y1 = 80 + i * 120 + 20; // +20 for center offset
          const x2 = isLeft2 ? "30%" : "70%";
          const y2 = 80 + (i + 1) * 120 + 20;

          return (
            <path
              key={`line-${i}`}
              d={`M ${x1} ${y1} C 50% ${y1}, 50% ${y2}, ${x2} ${y2}`}
              stroke="url(#glowG)"
              strokeWidth="3"
              fill="none"
              style={{ filter: "drop-shadow(0 0 8px rgba(0, 255, 255, 0.4))" }}
            />
          );
        })}
      </svg>

      {/* Nodes */}
      {problems.map((problem, i) => {
        const isLeft = i % 2 === 0;
        
        return (
          <div key={problem.id} style={{
            position: "absolute",
            top: 80 + i * 120,
            left: isLeft ? "30%" : "70%",
            transform: "translateX(-50%)",
            zIndex: 10
          }}>
            <Link href={`/problems/${problem.slug}`} style={{ textDecoration: "none" }}>
              <div style={{
                position: "relative",
                width: 48, height: 48,
                background: "rgba(10,10,10,0.8)",
                border: "2px solid",
                borderColor: problem.difficulty === "EASY" ? "var(--green)" : problem.difficulty === "MEDIUM" ? "var(--yellow)" : "var(--red)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 20px ${problem.difficulty === "EASY" ? "rgba(16,185,129,0.3)" : problem.difficulty === "MEDIUM" ? "rgba(234,179,8,0.3)" : "rgba(239,68,68,0.3)"}`,
                transition: "transform 0.2s, box-shadow 0.2s",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.15)";
                e.currentTarget.style.boxShadow = `0 0 30px ${problem.difficulty === "EASY" ? "rgba(16,185,129,0.5)" : problem.difficulty === "MEDIUM" ? "rgba(234,179,8,0.5)" : "rgba(239,68,68,0.5)"}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = `0 0 20px ${problem.difficulty === "EASY" ? "rgba(16,185,129,0.3)" : problem.difficulty === "MEDIUM" ? "rgba(234,179,8,0.3)" : "rgba(239,68,68,0.3)"}`;
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{i + 1}</span>
                
                {/* Floating Tooltip Label */}
                <div style={{
                  position: "absolute",
                  top: "50%",
                  [isLeft ? "left" : "right"]: 60,
                  transform: "translateY(-50%)",
                  background: "rgba(20,20,25,0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  padding: "8px 16px",
                  borderRadius: 8,
                  whiteSpace: "nowrap",
                  textAlign: isLeft ? "left" : "right",
                  backdropFilter: "blur(10px)"
                }}>
                  <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    {problem.title}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
                    {problem.tags?.slice(0, 2).join(" • ") || "Algorithm"}
                  </div>
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
