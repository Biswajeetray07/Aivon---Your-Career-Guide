import { defineConfig, DefaultQueueEventAdapter, DefaultCronAdapter, MemoryStreamAdapterManager, MemoryStateAdapter } from '@motiadev/core'
import endpointPlugin from '@motiadev/plugin-endpoint/plugin'
import cors from 'cors'
import compression from 'compression'
import { Server as SocketServer } from 'socket.io'
import type { Express } from 'express'

const ALLOWED_ORIGINS = [
  'https://aivon-mentor.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
]

const corsMiddleware = cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-backend'],
  maxAge: 86400,
});

/**
 * 🔌 Attach Socket.io to Express app
 * 
 * Strategy: Express stores its HTTP server reference internally after
 * server.listen() is called. We use a polling interval to wait until
 * the server is available, then attach Socket.io to it.
 * 
 * This works because Motia calls `const server = http.createServer(app)`
 * and then `server.listen(port)`, but we only get the `app` reference
 * in the callback (before the server is created). So we wait.
 */
function attachSocketIo(app: Express) {
  // Register the /emit endpoint immediately (Express routes work regardless)
  app.post('/emit', (req: any, res: any) => {
    const io = (app as any).__socketio;
    if (!io) {
      return res.status(503).json({ error: 'Socket.io not yet initialized' });
    }
    
    const { topic, submissionId, event, payload } = req.body || {};
    const targetTopic = topic || submissionId;
    const targetEvent = event || 'judge-update';
    const targetPayload = payload !== undefined ? payload : event;

    if (!targetTopic) {
      return res.status(400).json({ error: 'Missing topic/submissionId' });
    }

    // 🚀 Slim Payload before broadcasting (Optimization 9)
    // We ONLY slim down intermediate RUNNING/PENDING events. 
    // The UI TestExplorer strictly requires the full `details` block on DONE to render the execution terminal.
    let slimmedPayload = targetPayload;
    
    if (targetPayload && typeof targetPayload === 'object' && targetPayload.submission) {
       const sub = targetPayload.submission;
       const isFinalState = targetPayload.status === 'DONE' || sub.status === 'ERROR' || sub.status === 'ACCEPTED' || sub.status === 'WRONG_ANSWER' || sub.status === 'RUNTIME_ERROR' || sub.status === 'TIME_LIMIT_EXCEEDED' || sub.status === 'COMPILATION_ERROR';

       slimmedPayload = {
         ...targetPayload,
         submission: {
           id: sub.id,
           status: sub.status,
           runtime: sub.runtime,
           memory: sub.memory,
           details: (targetPayload.status === 'RUNNING' || !isFinalState) 
             ? (sub.details ? {
                passedCases: sub.details.passedCases || sub.details.passedCount,
                totalCases: sub.details.totalCases || sub.details.totalCount,
                hasDetails: true
               } : null)
             : sub.details
         }
       };
    }

    io.to(targetTopic).emit(targetEvent, slimmedPayload);
    res.json({ success: true, topic: targetTopic, slimmed: targetPayload !== slimmedPayload });
  });

  // Poll for the HTTP server to become available
  let attempts = 0;
  const maxAttempts = 60; // 30 seconds max
  
  const interval = setInterval(() => {
    attempts++;

    // Express stores the server on the app when you call app.listen(),
    // but Motia uses http.createServer(app) + server.listen(). 
    // The 'request' event is bound to the app by http.createServer.
    // We can find the server by checking if the app has been mounted.

    // Look for any active TCP server that has this app as a handler
    try {
      // When http.createServer(app) is called, Node binds `app` as
      // the 'request' listener. We can't easily reverse-lookup.
      // Instead, let's check process._getActiveHandles() for HTTP servers.
      const handles = (process as any)._getActiveHandles?.() || [];
      for (const handle of handles) {
        if (handle?.constructor?.name === 'Server' && typeof handle.address === 'function') {
          const addr = handle.address();
          if (addr && addr.port) {
            // Found the HTTP server!
            const httpServer = handle;
            
            const io = new SocketServer(httpServer, {
              cors: {
                origin: ALLOWED_ORIGINS,
                methods: ['GET', 'POST'],
                credentials: true,
              },
              path: '/socket.io/',
              transports: ['websocket', 'polling'],
            });

            // Store reference on app for /emit endpoint
            (app as any).__socketio = io;

            io.on('connection', (socket) => {
              console.log(`📡 [Socket.io] Client connected: ${socket.id}`);
              
              socket.on('subscribe', (topics: string | string[]) => {
                const arr = Array.isArray(topics) ? topics : [topics];
                arr.forEach(t => {
                  if (typeof t === 'string' && t.trim()) {
                    socket.join(t);
                  }
                });
              });

              socket.on('unsubscribe', (topics: string | string[]) => {
                const arr = Array.isArray(topics) ? topics : [topics];
                arr.forEach(t => socket.leave(t));
              });

              socket.on('disconnect', () => {
                console.log(`🔌 [Socket.io] Client disconnected: ${socket.id}`);
              });
            });

            console.log(`🚀 [Socket.io] Successfully attached to HTTP server on port ${addr.port}`);
            clearInterval(interval);
            return;
          }
        }
      }
    } catch (err) {
      // Silently retry
    }

    if (attempts >= maxAttempts) {
      console.warn('⚠️ [Socket.io] Timed out waiting for HTTP server (30s). Real-time disabled.');
      clearInterval(interval);
    }
  }, 500);
}

export default defineConfig({
  plugins: [endpointPlugin],
  adapters: {
    events: new DefaultQueueEventAdapter(),
    cron: new DefaultCronAdapter(),
    streams: new MemoryStreamAdapterManager(),
    state: new MemoryStateAdapter(),
  },
  app: (app) => {
    app.use(compression({ level: 6 })); // Optimal CPU/size ratio for JSON
    app.use(corsMiddleware);
    attachSocketIo(app);
  }
})
