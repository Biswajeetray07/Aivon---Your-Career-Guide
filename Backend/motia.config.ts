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

/**
 * 🔌 Socket.io Motia Plugin
 * 
 * Motia's 'app' hook runs before the HTTP server is created.
 * Motia's plugin system provides access to the live 'server' instance,
 * allowing us to attach Socket.io correctly on the same port.
 */
function socketIoPlugin(context: any) {
    const { app, server } = context;
    
    if (!server) {
        console.warn('⚠️ [Socket.io Plugin] HTTP server not found in context');
        return { workbench: [] };
    }

    const io = new SocketServer(server, {
        cors: {
            origin: ALLOWED_ORIGINS,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        path: '/socket.io/',
    });

    // Internal /emit route to allow Motia steps to push data to clients
    app.post('/emit', (req: any, res: any) => {
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

    io.on('connection', (socket) => {
        console.log(`📡 [Socket.io] Client connected: ${socket.id}`);
        
        socket.on('subscribe', (topics: string | string[]) => {
            const arr = Array.isArray(topics) ? topics : [topics];
            arr.forEach(t => {
                if (typeof t === 'string' && t.trim()) {
                    socket.join(t);
                    console.log(`✅ [Socket.io] Subscribed ${socket.id} to ${t}`);
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

    console.log('🚀 [Socket.io Plugin] Successfully attached to server');
    return { workbench: [] };
}

export default defineConfig({
  plugins: [
    endpointPlugin,
    socketIoPlugin
  ],
  adapters: {
    events: new DefaultQueueEventAdapter(),
    cron: new DefaultCronAdapter(),
    streams: new MemoryStreamAdapterManager(),
    state: new MemoryStateAdapter(),
  },
  app: (app) => {
    app.use(corsMiddleware);
  }
})
