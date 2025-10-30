import { Hono } from "hono";
import type { Context } from "hono";
import { getEvents } from "@x402place/shared/lib/canvas";

export function registerHistoryRoutes(app: Hono) {
    // Get pixel update history within a time range
    app.get("/api/history", async (c: Context) => {
        const since = c.req.query("since");
        const until = c.req.query("until");

        if (!since) {
            return c.json({ error: "Missing 'since' query parameter" }, 400);
        }

        const sinceTimestamp = parseInt(since, 10);
        if (isNaN(sinceTimestamp)) {
            return c.json({ error: "'since' must be a valid timestamp" }, 400);
        }

        let untilTimestamp: number | undefined;
        if (until) {
            untilTimestamp = parseInt(until, 10);
            if (isNaN(untilTimestamp)) {
                return c.json({ error: "'until' must be a valid timestamp" }, 400);
            }
        }

        try {
            const events = await getEvents(sinceTimestamp, untilTimestamp);
            return c.json(events);
        } catch (error) {
            console.error("Failed to fetch history:", error);
            return c.json({ error: "Failed to fetch history" }, 500);
        }
    });
}

