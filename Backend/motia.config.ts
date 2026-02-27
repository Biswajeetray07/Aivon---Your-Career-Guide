import { defineConfig, DefaultQueueEventAdapter, DefaultCronAdapter, MemoryStreamAdapterManager, MemoryStateAdapter } from '@motiadev/core'
import endpointPlugin from '@motiadev/plugin-endpoint/plugin'
import cors from 'cors'
import { Server as SocketServer } from 'socket.io'

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

// Global socket.io instance — used by the /emit endpoint
let io: SocketServer | null = null;

export default defineConfig({
  plugins: [endpointPlugin],
  adapters: {
    events: new DefaultQueueEventAdapter(),
    cron: new DefaultCronAdapter(),
    streams: new MemoryStreamAdapterManager(),
    state: new MemoryStateAdapter(),
  },
  app: (app) => {
    app.use(corsMiddleware);

    // ─── Internal /emit endpoint for execute-submission.step.ts ───
    // This replaces the standalone socket-server.ts
    app.post('/emit', (req: any, res: any) => {
      if (!io) {
        return res.status(503).json({ error: 'Socket.io not initialized yet' });
      }

      const { topic, submissionId, event, payload } = req.body || {};
      const targetTopic = topic || submissionId;
      const targetEvent = event || 'judge-update';
      const targetPayload = payload !== undefined ? payload : event;

      if (!targetTopic) {
        return res.status(400).json({ error: 'Missing topic/submissionId' });
      }

      io.to(targetTopic).emit(targetEvent, targetPayload);
      res.json({ success: true, topic: targetTopic });
    });

    // ─── Attach Socket.io to the Express HTTP server ───
    // We defer this to the next tick so Motia has time to create the server
    setTimeout(() => {
      try {
        // Express stores the HTTP server reference internally
        const server = (app as any)?.server || (app as any)?._server;
        
        if (!server) {
          // Fallback: listen for the 'listening' event on the app
          console.log('⚠️ [Socket.io] Could not find HTTP server reference, socket.io disabled');
          return;
        }

        io = new SocketServer(server, {
          cors: {
            origin: ALLOWED_ORIGINS,
            methods: ['GET', 'POST'],
            credentials: true,
          },
          path: '/socket.io/',
        });

        io.on('connection', (socket) => {
          socket.on('subscribe', (topics: string | string[]) => {
            const arr = Array.isArray(topics) ? topics : [topics];
            arr.forEach(t => {
              if (typeof t === 'string' && t.trim()) socket.join(t);
            });
          });

          socket.on('unsubscribe', (topics: string | string[]) => {
            const arr = Array.isArray(topics) ? topics : [topics];
            arr.forEach(t => socket.leave(t));
          });
        });

        console.log('✅ [Socket.io] Real-time verdict server attached to Motia');
      } catch (err: any) {
        console.warn('⚠️ [Socket.io] Failed to attach:', err.message);
      }
    }, 2000); // Give Motia 2s to bind the server
  }
})
