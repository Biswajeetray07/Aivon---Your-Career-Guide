import { defineConfig } from '@motiadev/core'
import endpointPlugin from '@motiadev/plugin-endpoint/plugin'

export default defineConfig({
  plugins: [endpointPlugin],
  app: (app) => {
    // CORS: Replace Motia's wildcard "*" with the actual requesting origin
    app.use((req: any, res: any, next: any) => {
      const originalSetHeader = res.setHeader;
      res.setHeader = function(name: string, value: any) {
        if (name.toLowerCase() === 'access-control-allow-origin' && value === '*') {
          const origin = req.headers.origin;
          if (origin) {
            return originalSetHeader.call(this, name, origin);
          }
        }
        return originalSetHeader.call(this, name, value);
      };
      next();
    });
  }
})

