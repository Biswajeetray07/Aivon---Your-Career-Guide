import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3003";

type EventCallback = (payload: any) => void;

export function useLiveSocket(topics: string[]) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  
  // Create a ref specifically for all registered listeners to avoid unnecessary effect triggers
  const listenersRef = useRef<Record<string, Set<EventCallback>>>({});

  // 1. Manage the underlying connection and topics
  useEffect(() => {
    // If no topics requested, no need to connect
    if (!topics || topics.length === 0) return;

    // Filter out empties
    const validTopics = topics.filter(t => t && t.trim().length > 0);
    if (validTopics.length === 0) return;

    if (!socketRef.current) {
        socketRef.current = io(SOCKET_URL, { reconnectionAttempts: 5, reconnectionDelay: 1000 });
    }

    const s = socketRef.current;

    const onConnect = () => {
      setConnected(true);
      s.emit("subscribe", validTopics);
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    

    // If already connected by the time this effect runs, immediately subscribe 
    // to new topics from the prop
    if (s.connected) {
       s.emit("subscribe", validTopics);
    }

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      
      // Tell server we are unsubscribing
      if (s.connected) {
        s.emit("unsubscribe", validTopics);
      }
      
      // Optional: disconnect completely if component unmounts. 
      // If we want a truly global multiplexed socket, this hook should ideally use a global Context,
      // but creating a new socket per page component tree is acceptable for now.
      s.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(topics)]); // Stringify array to prevent deep equality reference triggers

  // 2. Allow components to register handlers for specific events
  const listen = (eventName: string, callback: EventCallback) => {
    if (!listenersRef.current[eventName]) {
        listenersRef.current[eventName] = new Set();
        
        // Bind the actual socket.io listener if it's the first time
        if (socketRef.current) {
            socketRef.current.on(eventName, (payload: any) => {
                listenersRef.current[eventName]?.forEach(cb => cb(payload));
            });
        }
    }
    
    listenersRef.current[eventName].add(callback);
    
    // Return a teardown function
    return () => {
        const set = listenersRef.current[eventName];
        if (set) {
            set.delete(callback);
            if (set.size === 0) {
               delete listenersRef.current[eventName];
               if (socketRef.current) {
                  socketRef.current.off(eventName);
               }
            }
        }
    };
  };

  return { connected, listen };
}
