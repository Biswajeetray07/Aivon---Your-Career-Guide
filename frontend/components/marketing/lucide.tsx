import React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GenericIcon = (props: any) => (
  <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
    <circle cx="12" cy="12" r="10"></circle>
  </svg>
);

export const BrainCircuit = GenericIcon;
export const Bug = GenericIcon;
export const Lightbulb = GenericIcon;
export const GitMerge = GenericIcon;
export const ArrowRight = GenericIcon;
export const Check = GenericIcon;
export const Terminal = GenericIcon;
export const Play = GenericIcon;
export const Loader2 = GenericIcon;
export const ShieldCheck = GenericIcon;
export const DatabaseZap = GenericIcon;
export const CodeSquare = GenericIcon;
export const Server = GenericIcon;
export const Zap = GenericIcon;
export const Bot = GenericIcon;
export const TrendingUp = GenericIcon;
