import { getRedis } from "@x402place/shared/lib/redis";
import { PixelUpdateEvent } from "@x402place/shared/types/pixel";
import { upsertPixels, saveEvents, getAllPixels, saveSnapshot } from "@x402place/shared/lib/canvas";

const STREAM_KEY = "canvas:events";
const GROUP_NAME = "workers";
const CONSUMER_NAME = "worker-1";
const BATCH_INTERVAL = 500; // ms

async function generateSnapshot() {
  try {
    const pixels = await getAllPixels();
    // In production, you would generate an image/blob and upload to storage
    // For now, we'll create a simple snapshot record
    await saveSnapshot({
      blobUrl: `snapshot-${Date.now()}.png`, // Placeholder - implement actual blob storage
      timestamp: Date.now(),
    });
    console.log("Snapshot generated");
  } catch (err) {
    console.error("Failed to generate snapshot:", err);
  }
}

async function startWorker() {
    const redis = await getRedis();
  try {
    await redis.xGroupCreate(STREAM_KEY, GROUP_NAME, "0", { MKSTREAM: true });
  } catch (err: any) {
    if (!err.message.includes("BUSYGROUP")) throw err;
  }

  let buffer: PixelUpdateEvent[] = [];

  let snapshotCounter = 0;
  const SNAPSHOT_EVERY_N_BATCHES = 120; // Generate snapshot every ~60 seconds (120 * 500ms)

  setInterval(async () => {
    if (buffer.length === 0) return;
    try {
      // Save events to history
      await saveEvents(buffer);
      
      // Upsert pixels to current state
      await upsertPixels(buffer);
      
      console.log(`Processed ${buffer.length} events`);
      buffer = [];
      
      // Optional: generate snapshot periodically
      snapshotCounter++;
      if (snapshotCounter >= SNAPSHOT_EVERY_N_BATCHES) {
        snapshotCounter = 0;
        await generateSnapshot();
      }
    } catch (err) {
      console.error("Worker batch write error:", err);
    }
  }, BATCH_INTERVAL);

  while (true) {
    try {
      const resp = await redis.xReadGroup(
        GROUP_NAME,
        CONSUMER_NAME,
        [{ key: STREAM_KEY, id: ">" }],
        { BLOCK: 1000, COUNT: 50 }
      );

      if (resp) {
        for (const stream of resp) {
          for (const message of stream.messages) {
            const fields = message.message;
            const event: PixelUpdateEvent = {
              event_id: fields.event_id,
              x: parseInt(fields.x),
              y: parseInt(fields.y),
              color: fields.color,
              ts: parseInt(fields.ts),
              user_id: fields.user_id,
            };

            buffer.push(event);
            await redis.xAck(STREAM_KEY, GROUP_NAME, message.id);
          }
        }
      }
    } catch (err) {
      console.error("Worker read error:", err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

console.log("🔧 Starting canvas worker...");
startWorker().catch((err) => console.error("Worker failed:", err));