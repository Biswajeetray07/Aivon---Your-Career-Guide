import { defineConfig, DefaultQueueEventAdapter, DefaultCronAdapter, MemoryStreamAdapterManager, MemoryStateAdapter } from '@motiadev/core'
import endpointPlugin from '@motiadev/plugin-endpoint/plugin'
import cors from 'cors'

/**
 * 🏆 PRODUCTION OPTIMIZATION
 * 
 * We use InMemory adapters to SKIP the internal Redis server boot,
 * saving ~200MB of RAM on Render's free tier.
 * 
 * Required Render Env Vars:
 *   MOTIA_DOCKER_DISABLE_WORKBENCH=true  (disables the Workbench UI)
 */
const corsMiddleware = cors({
  origin: [
    'https://aivon-mentor.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-backend'],
  maxAge: 86400,
});

export default defineConfig({
  plugins: [endpointPlugin],
  // ✅ CRITICAL: Use InMemory adapters to bypass Redis startup
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


