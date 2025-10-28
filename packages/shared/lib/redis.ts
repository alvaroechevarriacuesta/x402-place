import { createClient, RedisClientType } from "redis";
import { PixelUpdateEvent } from "../types/pixel";
let client: RedisClientType | null = null;


export async function getRedis(): Promise<RedisClientType> {
    if (client && client.isOpen) return client;

    client = createClient({
        url: process.env.REDIS_URL,
        socket: {
            connectTimeout: 5000,
            reconnectStrategy: (retries: number) => Math.min(retries * 50, 500)
        },
    });

    client.on("error", (err: Error) => console.error("Redis Client Error:", err));
    client.on("connect", () => console.log("Redis connected"));

    if (!client.isOpen) await client.connect();

    return client;
}

export async function closeRedis() {
    if (client && client.isOpen) await client.quit();
}

// DURABLE STREAMS
const STREAM_KEY = "canvas:events";

export async function addCanvasEvent(event: PixelUpdateEvent) {
    const redis = await getRedis();

    await redis.xAdd(STREAM_KEY, "*", {
            event_id: event.event_id,
            x: String(event.x),
            y: String(event.y),
            color: event.color,
            ts: String(event.ts),
          });
}

export async function ensureConsumerGroup(groupName = "workers") {
    const redis = await getRedis();
  
    try {
      await redis.xGroupCreate(STREAM_KEY, groupName, "0", { MKSTREAM: true });
      console.log(`Created Redis consumer group: ${groupName}`);
    } catch (err: any) {
      if (err.message.includes("BUSYGROUP")) {
      } else {
        console.error("Error creating consumer group:", err);
        throw err;
      }
    }
  }

export async function trimCanvasEvents(maxLen = 1_000_000) {
    const redis = await getRedis();
    await redis.xTrim(STREAM_KEY, { strategy: "MAXLEN", strategyModifier: "~", threshold: maxLen });
  }

// PUB / SUB (deliver live updates to frontend)

export async function publishEvent(event: PixelUpdateEvent) {
    const redis = await getRedis();
    await redis.publish("canvas:live", JSON.stringify(event));
}

export async function subscribe(
    onMessage: (event: PixelUpdateEvent) => void
): Promise<RedisClientType> {
    // Duplicate the client because Redis in subscribe mode can't run other commands
    const redis = (await getRedis()).duplicate();
    await redis.connect();

    await redis.subscribe("canvas:live", (msg: string) => {
        try {
            const parsed = JSON.parse(msg) as PixelUpdateEvent;
            onMessage(parsed);
        } catch (err) {
            console.error("Failed to parse Redis pubsub message:", msg, err);
        }
    });

    console.log("Subscribed to canvas:live channel");
    return redis;
}
