import { useEffect, useState } from "react";
import { useLiveSocket } from "./useLiveSocket";

export type JudgeEvent =
  | { status: "QUEUED" | "PENDING" }
  | { status: "RUNNING"; progress: { current: number; total: number }; message: string }
  | { status: "DONE"; submission: unknown }
  | { status: "ERROR"; message: string };

export function useJudgeSocket(
  submissionId: string | null,
  onUpdate?: (event: JudgeEvent) => void,
) {
  const { connected, listen } = useLiveSocket(submissionId ? [submissionId] : []);
  const [lastEvent, setLastEvent] = useState<JudgeEvent | null>(null);

  useEffect(() => {
    if (!submissionId) return;

    // The legacy socket logic wrapped the full event payload inside a "judge-update" socket.io event.
    // The new pub-sub backend routes it to the `submissionId` topic explicitly under the "judge-update" event name.
    const unlisten = listen("judge-update", (data: JudgeEvent) => {
      console.log("[useJudgeSocket] Update:", data);
      setLastEvent(data);
      if (onUpdate) onUpdate(data);
    });

    return () => {
      unlisten();
    };
  }, [submissionId, listen, onUpdate]);

  return { connected, lastEvent };
}
