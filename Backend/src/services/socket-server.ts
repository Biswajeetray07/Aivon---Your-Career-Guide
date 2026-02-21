import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer((req, res) => {
  // Simple internal REST endpoint to receive events from execute-submission.step.ts
  if (req.method === "POST" && req.url === "/emit") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        if (data.submissionId && data.event) {
          // Emit strictly to the requested submission's room
          io.to(data.submissionId).emit("judge-update", data.event);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing submissionId or event" }));
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
  cors: { origin: "*" }, // Allow all origins for dev
});

io.on("connection", (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  
  socket.on("subscribe", (submissionId) => {
    if (typeof submissionId === "string" && submissionId.trim().length > 0) {
      console.log(`[Socket.IO] Client ${socket.id} subscribed to ${submissionId}`);
      socket.join(submissionId);
    }
  });

  socket.on("disconnect", () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`[Socket.IO] Real-time verdict server listening on port ${PORT}`);
});
