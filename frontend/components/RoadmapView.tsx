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
              d={`M ${x1} ${y1} L 50% ${y1} L 50% ${y2} L ${x2} ${y2}`}
              stroke="url(#glowG)"
              strokeWidth="2"
              fill="none"
              style={{ filter: "drop-shadow(0 0 6px rgba(0, 194, 255, 0.5))" }}
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
                width: 44, height: 44,
                background: "#0A0F14",
                border: "1px solid",
                borderColor: problem.difficulty === "EASY" ? "#00E5B0" : problem.difficulty === "MEDIUM" ? "#FACC15" : "#FF5F56",
                borderRadius: 4,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 15px ${problem.difficulty === "EASY" ? "rgba(0,229,176,0.3)" : problem.difficulty === "MEDIUM" ? "rgba(250,204,21,0.3)" : "rgba(255,95,86,0.3)"}`,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: "pointer",
                fontFamily: "var(--font-geist-mono)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.1) translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 0 25px ${problem.difficulty === "EASY" ? "rgba(0,229,176,0.5)" : problem.difficulty === "MEDIUM" ? "rgba(250,204,21,0.5)" : "rgba(255,95,86,0.5)"}`;
                e.currentTarget.style.background = problem.difficulty === "EASY" ? "rgba(0,229,176,0.1)" : problem.difficulty === "MEDIUM" ? "rgba(250,204,21,0.1)" : "rgba(255,95,86,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = `0 0 15px ${problem.difficulty === "EASY" ? "rgba(0,229,176,0.3)" : problem.difficulty === "MEDIUM" ? "rgba(250,204,21,0.3)" : "rgba(255,95,86,0.3)"}`;
                e.currentTarget.style.background = "#0A0F14";
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{i + 1}</span>
                
                {/* Floating Tooltip Label */}
                <div style={{
                  position: "absolute",
                  top: "50%",
                  [isLeft ? "left" : "right"]: 60,
                  transform: "translateY(-50%)",
                  background: "rgba(5,7,10,0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  padding: "10px 14px",
                  borderRadius: 4,
                  whiteSpace: "nowrap",
                  textAlign: isLeft ? "left" : "right",
                  backdropFilter: "blur(10px)",
                  fontFamily: "var(--font-geist-mono)"
                }}>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, marginBottom: 4, letterSpacing: "0.05em" }}>
                    {problem.title}
                  </div>
                  <div style={{ color: problem.difficulty === "EASY" ? "#00E5B0" : problem.difficulty === "MEDIUM" ? "#FACC15" : "#FF5F56", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {problem.difficulty} <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 4px" }}>|</span> {problem.tags?.slice(0, 2).join(" • ") || "Algo"}
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
