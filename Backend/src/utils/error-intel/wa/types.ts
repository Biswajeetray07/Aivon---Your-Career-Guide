export type NormalizedOutput = {
  raw: string;
  lines: string[];
  tokens: string[];
  numericTokens: number[];
};

export type DiffSignal = {
  firstMismatchIndex: number;
  lengthDelta: number;
  lineCountDelta: number;
  numericDelta?: number;
  prefixMatchRatio: number;
  suffixMatchRatio: number;
};

export type DetectorResult = {
  cause: string;
  confidence: number;
  evidence: string[];
};

export type HintSet = {
  level1: string;
  level2: string;
  level3: string;
};

export type WARootCauseResult = {
  cause: string;
  confidence: number;
  humanSummary: string;
  diffSignal: DiffSignal;
  hints: HintSet;
  evidence: string[];
};
