import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { registerPlacePixelRoutes } from "./routes/place";
import { registerSnapshotRoutes } from "./routes/snapshot";
import { setupWebSocket } from "./ws";

const app = new Hono();

registerPlacePixelRoutes(app);
registerSnapshotRoutes(app);

const port = Number(process.env.PORT) || 3001;
const wsPort = Number(process.env.WS_PORT) || port + 1;

console.log(`🚀 Server starting on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

// Setup WebSocket server on a different port
setupWebSocket(wsPort);