import { subscribe } from "@x402place/shared/lib/redis";

import WebSocket, { WebSocketServer } from "ws";

const clients = new Set<WebSocket>();

export function setupWebSocket(port: number) {
    const wss = new WebSocketServer({ port, path: "/ws" });

    wss.on("connection", (ws) => {
        clients.add(ws);
        ws.on("close", () => {
            clients.delete(ws);
        });
    });

    wss.on("error", (error) => {
        console.error("WebSocket server error:", error);
    });

    subscribe((event) => {
        const message = JSON.stringify({type: "pixel_update", payload: event});
        clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    console.log(`WebSocket server running on ws://localhost:${port}/ws`);
}