import type { NormalizedOutput } from "./types";

export function normalizeOutput(raw: string | null | undefined): NormalizedOutput {
  if (!raw) {
    return { raw: "", lines: [], tokens: [], numericTokens: [] };
  }

  // 1. normalize line endings
  // 2. trim trailing spaces
  const normalizedRaw = raw.replace(/\r\n/g, "\n").trim();

  // 3. split into lines
  const lines = normalizedRaw.split("\n").map(l => l.trim());

  // tokenize by whitespace
  const tokens = normalizedRaw.split(/\s+/).filter(Boolean);

  // 4. detect numeric tokens
  const numericTokens = tokens
    .map(t => Number(t))
    .filter(n => !Number.isNaN(n));

  return {
    raw: normalizedRaw,
    lines,
    tokens,
    numericTokens,
  };
}
