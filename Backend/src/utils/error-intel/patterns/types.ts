export type PatternDef = {
  id: string;
  regex: RegExp;
  errorType: string;
  shortExplanation: string;
  probableCause: string;
  severity: "low" | "medium" | "high";
};
