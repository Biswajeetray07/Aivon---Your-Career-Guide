// Removes internal node strings, docker paths, and extracts proper line numbers
export function sanitizeError(
  errorText: string | null,
  language: string,
  judge0StatusId: number
) {
  if (!errorText?.trim()) {
    return { errorType: null, line: null, message: null, raw: null };
  }

  const raw = errorText.trim();
  const lines = raw.split("\n").filter(Boolean);
  const lang = language.toLowerCase();
  
  let headerOffset = 0;
  if (lang === "python" || lang === "python3") headerOffset = 3;

  try {
    if (lang === "python" || lang === "python3") {
      const lastLine = lines.slice(-1)[0]?.trim() || "";
      let errorType = "RuntimeError";
      let message = lastLine;
      const colonIdx = lastLine.indexOf(":");
      
      if (colonIdx > 0) {
        const candidate = lastLine.slice(0, colonIdx).trim();
        if (/^[A-Za-z][A-Za-z0-9]*(?:Error|Exception|Warning)$/.test(candidate)) {
          errorType = candidate;
          message = lastLine.slice(colonIdx + 1).trim();
        }
      }

      let userLine: number | null = null;
      const TEMPLATE_MARKERS = ["if __name__", "__main__", "__format", "__build_tree", "sys.stdin", "###USERCODE###", "json.loads"];
      
      for (let i = lines.length - 2; i >= 0; i--) {
        const lineMatch = lines[i].match(/\bline\s+(\d+)/i);
        if (!lineMatch) continue;
        const contextLine = lines[i + 1] ?? "";
        if (!TEMPLATE_MARKERS.some(m => contextLine.includes(m))) {
          userLine = Math.max(1, parseInt(lineMatch[1], 10) - headerOffset);
          break;
        }
      }

      // Filter traceback to avoid docker logs
      const cleanTraceback = lines.filter(l => !l.includes("/sandbox/") && !l.includes("wrapper"));

      return { errorType, line: userLine, message, raw: cleanTraceback.join("\\n") };
    }
    
    // JS 
    if (lang === "javascript" || lang === "nodejs") {
       const errLine = lines.find(l => /\\bError:/i.test(l));
       let errorType = "RuntimeError";
       let message = lines[0] || raw;
       
       if (errLine) {
         const colonIdx = errLine.indexOf(":");
         if (colonIdx > 0) {
           errorType = errLine.slice(0, colonIdx).trim();
           message = errLine.slice(colonIdx + 1).trim();
         }
       }
       
       let userLine: number | null = null;
       for (const l of lines) {
         if (l.includes("at ") && !l.includes("node:") && !l.includes("__main")) {
           const m = l.match(/:(\\d+):\\d+/);
           if (m) {
             userLine = Math.max(1, parseInt(m[1], 10) - headerOffset);
             break;
           }
         }
       }
       return { errorType, line: userLine, message, raw };
    }
  } catch { /* Fallthrough */ }

  return {
    errorType: "RuntimeError",
    line: null,
    message: raw.split("\\n").filter(Boolean).slice(-1)[0] || raw,
    raw
  };
}
