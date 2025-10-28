import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { registerPlacePixelRoutes } from "./routes/place";

const app = new Hono();

registerPlacePixelRoutes(app);

const port = Number(process.env.PORT) || 3001;

console.log(`🚀 Server starting on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});