// lib/redis.ts
import { createClient, RedisClientType } from "redis";

let client: RedisClientType | null = null;

/**
 * Get or create a Redis client instance.
 * Ensures connection reuse across hot reloads (Next.js dev) and API calls.
 */
export async function getRedis(): Promise<RedisClientType> {
  if (client && client.isOpen) return client;

  client = createClient({
    url: process.env.REDIS_URL,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => Math.min(retries * 50, 500),
    },
  });

  client.on("error", (err) => console.error("🔴 Redis Client Error:", err));
  client.on("connect", () => console.log("🟢 Redis connected"));

  if (!client.isOpen) await client.connect();

  return client;
}

/* -------------------------------------------------------------------------- */
/*                                PUB / SUB                                   */
/* -------------------------------------------------------------------------- */

/**
 * Publish an event to subscribers (frontend live updates).
 */
export async function publishEvent(event: any) {
  const redis = await getRedis();
  await redis.publish("canvas:live", JSON.stringify(event));
}

/**
 * Subscribe to the live channel (used by WebSocket servers).
 */
export async function subscribeLive(
  onMessage: (event: any) => void
): Promise<RedisClientType> {
  const redis = (await getRedis()).duplicate();
  await redis.connect();

  await redis.subscribe("canvas:live", (msg) => {
    try {
      const parsed = JSON.parse(msg);
      onMessage(parsed);
    } catch (err) {
      console.error("Failed to parse Redis pubsub message:", msg);
    }
  });

  return redis;
}

/* -------------------------------------------------------------------------- */
/*                              STREAM OPERATIONS                              */
/* -------------------------------------------------------------------------- */

const STREAM_KEY = "canvas:events";

/**
 * Add a pixel update to the durable stream.
 */
export async function addCanvasEvent(event: {
  event_id: string;
  x: number;
  y: number;
  color: string;
  ts: number;
  user_id?: string;
}) {
  const redis = await getRedis();

  await redis.xAdd(STREAM_KEY, "*", {
    event_id: event.event_id,
    x: String(event.x),
    y: String(event.y),
    color: event.color,
    ts: String(event.ts),
    user_id: event.user_id ?? "",
  });
}

/**
 * Initialize the consumer group (safe to call multiple times).
 */
export async function ensureConsumerGroup(groupName = "workers") {
  const redis = await getRedis();

  try {
    await redis.xGroupCreate(STREAM_KEY, groupName, "0", { MKSTREAM: true });
    console.log(`✅ Created Redis consumer group: ${groupName}`);
  } catch (err: any) {
    if (err.message.includes("BUSYGROUP")) {
      // group already exists, that's fine
    } else {
      console.error("Error creating consumer group:", err);
      throw err;
    }
  }
}

/**
 * Trim the stream to keep memory under control.
 * - MAXLEN ~1,000,000 keeps roughly the last million updates.
 */
export async function trimCanvasEvents(maxLen = 1_000_000) {
  const redis = await getRedis();
  await redis.xTrim(STREAM_KEY, { strategy: "MAXLEN", strategyModifier: "~", threshold: maxLen });
}

/* -------------------------------------------------------------------------- */
/*                                COOLDOWN LOCK                               */
/* -------------------------------------------------------------------------- */

/**
 * Prevents rapid spam on the same pixel (not a strict lock).
 * Returns `true` if acquired, `false` otherwise.
 */
export async function acquirePixelCooldown(
  x: number,
  y: number,
  ttlSeconds = 2
): Promise<boolean> {
  const redis = await getRedis();
  const key = `pixel:cooldown:${x}:${y}`;
  const acquired = await redis.set(key, "1", {
    NX: true,
    EX: ttlSeconds,
  });
  return acquired === "OK";
}

/* -------------------------------------------------------------------------- */
/*                                 UTILITIES                                  */
/* -------------------------------------------------------------------------- */

export async function closeRedis() {
  if (client && client.isOpen) await client.quit();
}
