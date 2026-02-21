import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:3003";

export type JudgeEvent =
  | { status: "QUEUED" | "PENDING" }
  | { status: "RUNNING"; progress: { current: number; total: number }; message: string }
  | { status: "DONE"; submission: any }
  | { status: "ERROR"; message: string };

export function useJudgeSocket(
  submissionId: string | null,
  onUpdate?: (event: JudgeEvent) => void,
) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<JudgeEvent | null>(null);
  const onUpdateRef = useRef(onUpdate);

  // Keep ref in sync without causing the socket effect to re-run
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!submissionId) return;

    const s = io(SOCKET_URL, { reconnectionAttempts: 5, reconnectionDelay: 1000 });

    s.on("connect", () => {
      console.log("[Socket] Connected");
      setConnected(true);
      s.emit("subscribe", submissionId);
    });

    s.on("disconnect", () => {
      console.log("[Socket] Disconnected");
      setConnected(false);
    });

    s.on("judge-update", (data: JudgeEvent) => {
      console.log("[Socket] Update:", data);
      setLastEvent(data);
      onUpdateRef.current?.(data);
    });

    return () => {
      s.disconnect();
    };
  }, [submissionId]);  // socket only re-connects when submissionId changes

  return { connected, lastEvent };
}
