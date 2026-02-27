import { defineConfig } from '@motiadev/core'
import endpointPlugin from '@motiadev/plugin-endpoint/plugin'

const ALLOWED_ORIGINS = [
  'https://aivon-mentor.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

export default defineConfig({
  plugins: [endpointPlugin],
  app: (app) => {
    // Full CORS middleware — handles preflight and actual requests
    app.use((req: any, res: any, next: any) => {
      const origin = req.headers.origin;

      if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }

      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-backend');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400');

      // Handle preflight OPTIONS request immediately
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Override Motia's default "*" with our specific origin
      const originalSetHeader = res.setHeader.bind(res);
      res.setHeader = function(name: string, value: any) {
        if (name.toLowerCase() === 'access-control-allow-origin' && value === '*') {
          if (origin && ALLOWED_ORIGINS.includes(origin)) {
            return originalSetHeader(name, origin);
          }
        }
        return originalSetHeader(name, value);
      };

      next();
    });
  }
})
