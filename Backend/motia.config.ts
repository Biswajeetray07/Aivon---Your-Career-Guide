import { defineConfig } from '@motiadev/core'
import endpointPlugin from '@motiadev/plugin-endpoint/plugin'
import logsPlugin from '@motiadev/plugin-logs/plugin'
import observabilityPlugin from '@motiadev/plugin-observability/plugin'
import statesPlugin from '@motiadev/plugin-states/plugin'
import bullmqPlugin from '@motiadev/plugin-bullmq/plugin'

export default defineConfig({
  plugins: [observabilityPlugin, statesPlugin, endpointPlugin, logsPlugin, bullmqPlugin],
  app: (app) => {
    // Intercept headers to fix CORS mismatch between Motia's "*" and credentials:true
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
