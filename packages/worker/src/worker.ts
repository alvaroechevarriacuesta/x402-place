import { getRedis } from "@x402place/shared/lib/redis";
import { PixelUpdateEvent } from "@x402place/shared/types/pixel";
import { upsertPixels, saveEvents, getAllPixels, saveSnapshot } from "@x402place/shared/lib/canvas";
import { put } from "@vercel/blob";
import { PNG } from "pngjs";

const STREAM_KEY = "canvas:events";
const GROUP_NAME = "workers";
const CONSUMER_NAME = "worker-1";
const BATCH_INTERVAL = 500; // ms

// Canvas dimensions - should match frontend
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 1000;

async function generateSnapshot() {
  try {
    console.log("Starting snapshot generation...");
    const pixels = await getAllPixels();
    
    // Create PNG with canvas dimensions
    const png = new PNG({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      filterType: -1,
    });
    
    // Initialize with white background
    for (let y = 0; y < CANVAS_HEIGHT; y++) {
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        const idx = (CANVAS_WIDTH * y + x) << 2;
        png.data[idx] = 255;     // R
        png.data[idx + 1] = 255; // G
        png.data[idx + 2] = 255; // B
        png.data[idx + 3] = 255; // A
      }
    }
    
    // Fill in the pixels from database
    for (const pixel of pixels) {
      const { x, y, color } = pixel;
      
      // Convert hex color to RGB
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      
      // Set pixel in PNG
      const idx = (CANVAS_WIDTH * y + x) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255; // Full opacity
    }
    
    // Convert PNG to buffer
    const buffer = PNG.sync.write(png);
    
    // Upload to Vercel Blob
    const blob = await put(`canvas-snapshot-${Date.now()}.png`, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    
    // Save snapshot record
    await saveSnapshot({
      blobUrl: blob.url,
      timestamp: Date.now(),
    });
    
    console.log(`Snapshot generated and uploaded: ${blob.url}`);
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

  let buffer: Array<{ event: PixelUpdateEvent; messageId: string }> = [];
  let isProcessing = false;
  let isSnapshotting = false;

  // Batch processing - writes events to database
  setInterval(async () => {
    if (isProcessing || buffer.length === 0) return;
    isProcessing = true;
    
    const batchToProcess = [...buffer];
    const events = batchToProcess.map((item) => item.event);
    
    try {
      // Save events to history
      await saveEvents(events);
      
      // Upsert pixels to current state
      await upsertPixels(events);
      
      // ACK only after successful database write
      for (const item of batchToProcess) {
        await redis.xAck(STREAM_KEY, GROUP_NAME, item.messageId);
      }
      
      console.log(`Processed ${batchToProcess.length} events`);
      buffer = buffer.slice(batchToProcess.length);
    } catch (err) {
      console.error("Worker batch write error:", err);
      // Don't ACK - let Redis recover these messages on restart
    } finally {
      isProcessing = false;
    }
  }, BATCH_INTERVAL);

  // Separate interval for snapshot generation - runs independently
  setInterval(async () => {
    if (isSnapshotting) return;
    isSnapshotting = true;
    
    try {
      await generateSnapshot();
    } finally {
      isSnapshotting = false;
    }
  }, 60 * 60 * 1000); // Every hour

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

            buffer.push({ event, messageId: message.id });
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