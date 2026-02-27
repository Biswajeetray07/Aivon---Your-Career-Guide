export type RawFrustrationSignals = {
  // Submission Signals
  waCount: number;
  tleCount: number;
  compileBurstCount: number;
  repeatedSubmissionsCount: number;
  
  // Temporal Signals
  timeOnProblemMinutes: number;
  idleBurstCount: number;
  rapidSubmissionCount: number;
  
  // Editor Behavior
  editVolatilityHits: number;
  
  // Chat Signals
  negativeSentimentScore: number; // 0 to 1
  hintSpamCount: number;
};

export type FrustrationFeatures = {
  waStreak: number;
  tleStreak: number;
  compileBurst: number;
  timeOnProblemMin: number;
  idleBursts: number;
  rapidSubmissions: number;
  editVolatility: number;
  negativeSentiment: number;
  hintSpamCount: number;
};

export type FrustrationTrend = {
  currentScore: number;
  trend: "rising" | "stable" | "falling";
  velocity: number;
};

export type FrustrationState = {
  score: number; // 0-100
  level: "calm" | "mild" | "high" | "critical";
  trend: FrustrationTrend;
  lastScore: number;
  lastUpdated: Date | null;
  interventionsDelivered: number;
  lastInterventionAt: Date | null;
};
