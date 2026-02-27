import { createServer } from "http";
import { Server } from "socket.io";
import { createRequire } from "module";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

const httpServer = createServer((req, res) => {
  // Simple internal REST endpoint to receive events from execute-submission.step.ts
  if (req.method === "POST" && req.url === "/emit") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const targetTopic = data.topic || data.submissionId;
        const targetEvent = data.event;
        const targetPayload = data.payload !== undefined ? data.payload : data.event;

        if (targetTopic && targetEvent) {
          const eventName = data.topic ? targetEvent : "judge-update";
          io.to(targetTopic).emit(eventName, targetPayload);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, topic: targetTopic }));
        } else {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing topic/submissionId or event" }));
        }
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }
  
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    res.end("OK");
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  
  socket.on("subscribe", (topics: string | string[]) => {
    const topicsArr = Array.isArray(topics) ? topics : [topics];
    topicsArr.forEach(topic => {
      if (typeof topic === "string" && topic.trim().length > 0) {
        console.log(`[Socket.IO] Client ${socket.id} subscribed to topic: ${topic}`);
        socket.join(topic);
      }
    });
  });

  socket.on("unsubscribe", (topics: string | string[]) => {
    const topicsArr = Array.isArray(topics) ? topics : [topics];
    topicsArr.forEach(topic => {
        socket.leave(topic);
        console.log(`[Socket.IO] Client ${socket.id} unsubscribed from: ${topic}`);
    });
  });

  socket.on("disconnect", () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

const PORT = Number(process.env.SOCKET_PORT) || 3003;

// Graceful startup: if port is in use, kill the stale process and retry
httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`[Socket.IO] Port ${PORT} is busy. Attempting to reclaim...`);
    import("child_process").then(({ execSync }) => {
      try {
        execSync(`lsof -i:${PORT} -t | xargs kill -9`, { stdio: "ignore" });
        console.log(`[Socket.IO] Killed stale process on port ${PORT}. Retrying...`);
        setTimeout(() => {
          httpServer.listen(PORT, () => {
            console.log(`[Socket.IO] Real-time verdict server listening on port ${PORT}`);
          });
        }, 500);
      } catch {
        console.error(`[Socket.IO] Could not kill stale process on port ${PORT}. Please free it manually.`);
        process.exit(1);
      }
    });
  } else {
    console.error(`[Socket.IO] Server error:`, err);
    process.exit(1);
  }
});

httpServer.listen(PORT, () => {
  console.log(`[Socket.IO] Real-time verdict server listening on port ${PORT}`);
});
