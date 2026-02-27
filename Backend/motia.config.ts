import { defineConfig } from '@motiadev/core'
import endpointPlugin from '@motiadev/plugin-endpoint/plugin'
import cors from 'cors'

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
  app: (app) => {
    // Must be the VERY FIRST middleware
    app.use(corsMiddleware);
  }
})

