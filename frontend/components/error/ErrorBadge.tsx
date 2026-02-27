import { Badge } from "@/components/ui/badge";

interface ErrorBadgeProps {
  category: "COMPILE_ERROR" | "RUNTIME_ERROR" | "WRONG_ANSWER" | "TIME_LIMIT_EXCEEDED" | "MEMORY_LIMIT_EXCEEDED" | "SUCCESS" | "TLE" | "MLE" | "ACCEPTED" | string;
}

export function ErrorBadge({ category }: ErrorBadgeProps) {
  let label = "Error";
  let classes = "bg-red-500/20 text-red-400 border-red-500/50";

  switch (category) {
    case "COMPILE_ERROR":
      label = "Compile Error";
      classes = "bg-red-500/20 text-red-400 border-red-500/50";
      break;
    case "RUNTIME_ERROR":
      label = "Runtime Error";
      classes = "bg-orange-500/20 text-orange-400 border-orange-500/50";
      break;
    case "WRONG_ANSWER":
      label = "Wrong Answer";
      classes = "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      break;
    case "TIME_LIMIT_EXCEEDED":
    case "TLE":
      label = "Time Limit Exceeded";
      classes = "bg-purple-500/20 text-purple-400 border-purple-500/50";
      break;
    case "MEMORY_LIMIT_EXCEEDED":
    case "MLE":
      label = "Memory Limit Exceeded";
      classes = "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/50";
      break;
    case "SUCCESS":
    case "ACCEPTED":
      label = "Accepted";
      classes = "bg-green-500/20 text-emerald-400 border-green-500/50";
      break;
    default:
      label = category;
      classes = "bg-gray-500/20 text-gray-400 border-gray-500/50";
  }

  return (
    <Badge variant="danger" className={`px-2 py-0.5 font-mono text-xs shadow-lg backdrop-blur-md bg-transparent ${classes}`}>
      {label}
    </Badge>
  );
}
