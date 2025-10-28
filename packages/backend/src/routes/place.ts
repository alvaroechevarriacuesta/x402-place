import { Hono } from "hono";
import type { Context } from "hono";

export function registerPlacePixelRoutes(app: Hono) {
    app.post("/api/place", async (c: Context) => {
        const { x, y, color } = await c.req.json();
        if (typeof x !== "number" || typeof y !== "number") {
            return c.json({ error: "x and y must be numbers" }, 400);
        }
        if (x < 0 || x >= 1000 || y < 0 || y >= 1000) {
            return c.json({ error: "x and y must be between 0 and 999" }, 400);
        }
        const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
        if (!hexColorRegex.test(color)) {
            return c.json({ error: "color must be in #ffffff format" }, 400);
        }
        
        // TODO: Implement pixel placement logic
        return c.json({ success: true, x, y, color });
    });
}