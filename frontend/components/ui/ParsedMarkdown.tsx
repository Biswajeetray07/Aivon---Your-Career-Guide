import React from "react";

export default function ParsedMarkdown({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/```/);

  const parseInline = (str: string) => {
    const segments = str.split(/`([^`]+)`/);
    return segments.map((seg, i) => {
      if (i % 2 !== 0) {
        return (
          <code key={i} style={{ 
            background: "rgba(167,139,250,0.15)", 
            padding: "2px 6px", 
            borderRadius: 4, 
            fontFamily: "'JetBrains Mono', monospace", 
            color: "#d8b4fe",
            fontSize: "0.95em",
            border: "1px solid rgba(167,139,250,0.2)"
          }}>{seg}</code>
        );
      }
      
      const boldSegments = seg.split(/\*\*([^*]+)\*\*/);
      return boldSegments.map((bSeg, j) => {
        if (j % 2 !== 0) return <strong key={`${i}-${j}`} style={{ color: "#fff" }}>{bSeg}</strong>;
        return <span key={`${i}-${j}`}>{bSeg}</span>;
      });
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {parts.map((part, index) => {
        if (index % 2 === 0) {
          if (!part.trim()) return null;
          
          const lines = part.split('\n');
          const elements: React.ReactNode[] = [];
          let listItems: React.ReactNode[] = [];

          const pushList = () => {
            if (listItems.length > 0) {
              elements.push(
                <ul key={`ul-${elements.length}`} style={{ paddingLeft: 22, margin: "6px 0", display: "flex", flexDirection: "column", gap: 6, listStyleType: "disc", color: "#00FFFF" }}>
                  {[...listItems]}
                </ul>
              );
              listItems = [];
            }
          };

          lines.forEach((line, lIndex) => {
            const trimmed = line.trim();
            if (!trimmed) {
              pushList();
              return;
            }

            if (trimmed.startsWith('### ')) {
              pushList();
              elements.push(<h3 key={lIndex} style={{ fontSize: 13, fontWeight: 800, color: "#d8b4fe", marginTop: 12, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{parseInline(trimmed.slice(4))}</h3>);
            } else if (trimmed.startsWith('## ')) {
              pushList();
              elements.push(<h2 key={lIndex} style={{ fontSize: 15, fontWeight: 700, color: "#e9d5ff", marginTop: 16, marginBottom: 6 }}>{parseInline(trimmed.slice(3))}</h2>);
            } else if (trimmed.startsWith('# ')) {
              pushList();
              elements.push(<h1 key={lIndex} style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginTop: 16, marginBottom: 8 }}>{parseInline(trimmed.slice(2))}</h1>);
            } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
              listItems.push(<li key={lIndex} style={{ color: "#d1d5db", lineHeight: 1.6 }}><span style={{ color: "#d1d5db" }}>{parseInline(trimmed.slice(2))}</span></li>);
            } else {
              pushList();
              elements.push(<div key={lIndex} style={{ color: "#c0c0d0", lineHeight: 1.7, marginBottom: 6 }}>{parseInline(trimmed)}</div>);
            }
          });
          pushList();

          return (
            <div key={index} style={{ fontSize: 14 }}>
              {elements}
            </div>
          );
        } else {
          const newlineIdx = part.indexOf('\n');
          const lang = newlineIdx !== -1 ? part.substring(0, newlineIdx).trim() : '';
          const code = newlineIdx !== -1 ? part.substring(newlineIdx + 1).replace(/\n$/, '') : part;
          
          return (
            <div key={index} style={{
              background: "#080808",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              overflow: "hidden",
              margin: "12px 0",
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5)"
            }}>
              {lang && (
                <div style={{
                  background: "#111",
                  padding: "6px 14px",
                  fontSize: 10,
                  color: "#a1a1aa",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontFamily: "'Space Grotesk', sans-serif"
                }}>
                  {lang}
                </div>
              )}
              <pre style={{
                margin: 0,
                padding: "14px 16px",
                overflowX: "auto",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                lineHeight: 1.6,
              }}>
                <code style={{ color: "#e2e8f0" }}>{code}</code>
              </pre>
            </div>
          );
        }
      })}
    </div>
  );
}
