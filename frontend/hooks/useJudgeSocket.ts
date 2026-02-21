import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

// The standalone Socket.IO server runs on port 3003
const SOCKET_URL = "http://localhost:3003";

export type JudgeEvent =
  | { status: "QUEUED" | "PENDING" }
  | { status: "RUNNING"; progress: { current: number; total: number }; message: string }
  | { status: "DONE"; submission: any }
  | { status: "ERROR"; message: string };

export function useJudgeSocket(submissionId: string | null, onUpdate?: (event: JudgeEvent) => void) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<JudgeEvent | null>(null);

  useEffect(() => {
    if (!submissionId) return;

    // Connect to the Socket.IO server
    const s = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    s.on("connect", () => {
      console.log(`[Socket] Connected to realtime judge server`);
      setConnected(true);
      s.emit("subscribe", submissionId);
    });

    s.on("disconnect", () => {
      console.log(`[Socket] Disconnected from realtime judge server`);
      setConnected(false);
    });

    s.on("judge-update", (data: JudgeEvent) => {
      console.log(`[Socket] Update received:`, data);
      setLastEvent(data);
      if (onUpdate) onUpdate(data);
    });

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
      setLastEvent(null);
    };
  }, [submissionId, onUpdate]);

  return { connected, lastEvent };
}
