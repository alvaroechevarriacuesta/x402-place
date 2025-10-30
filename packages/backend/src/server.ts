import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { registerPlacePixelRoutes } from "./routes/place";
import { registerSnapshotRoutes } from "./routes/snapshot";
import { registerHistoryRoutes } from "./routes/history";
import { setupWebSocket } from "./ws";

const app = new Hono();

// Enable CORS for all routes
app.use('/*', cors({
  origin: '*', // Allow all origins (you can restrict this to your frontend URL if needed)
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

registerPlacePixelRoutes(app);
registerSnapshotRoutes(app);
registerHistoryRoutes(app);

const port = Number(process.env.PORT) || 3001;
const wsPort = Number(process.env.WS_PORT) || port + 1;

console.log(`🚀 Server starting on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

// Setup WebSocket server on a different port
setupWebSocket(wsPort);