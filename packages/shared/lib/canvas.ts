import { PixelUpdateEvent, Snapshot, Pixel } from '../types/pixel';
import { prisma } from './db';

export async function getLatestSnapshot(): Promise<Snapshot | null> {
  const snapshot = await prisma.snapshot.findFirst({
    orderBy: { timestamp: 'desc' },
  });

  if (!snapshot) return null;

  return {
    id: Number(snapshot.id),
    blobUrl: snapshot.blobUrl,
    timestamp: snapshot.timestamp.getTime(), // Convert Date to Unix timestamp
  };
}

export async function saveSnapshot(
  snapshot: Omit<Snapshot, 'id'>
): Promise<void> {
  await prisma.snapshot.create({
    data: {
      blobUrl: snapshot.blobUrl,
      timestamp: new Date(snapshot.timestamp),
    },
  });

  return;
}

export async function getEvents(
  since: number,
  until?: number
): Promise<PixelUpdateEvent[]> {
  const history = await prisma.history.findMany({
    where: {
      timestamp: {
        gte: new Date(since),
        ...(until ? { lte: new Date(until) } : {}),
      },
    },
    orderBy: {
      timestamp: 'asc',
    },
  });

  return history.map(
    (record: any): PixelUpdateEvent => ({
      event_id: record.id.toString(),
      x: record.x,
      y: record.y,
      color: record.color,
      ts: record.timestamp.getTime(),
    })
  );
}

export async function saveEvents(events: PixelUpdateEvent[]): Promise<void> {
  await prisma.history.createMany({
    data: events.map(event => ({
      x: event.x,
      y: event.y,
      color: event.color,
      timestamp: new Date(event.ts),
    })),
  });
}

export async function upsertPixels(pixels: Pixel[]): Promise<void> {
  await prisma.$transaction(
    pixels.map(pixel =>
      prisma.pixel.upsert({
        where: {
          x_y: {
            x: pixel.x,
            y: pixel.y,
          },
        },
        update: {
          color: pixel.color,
        },
        create: {
          x: pixel.x,
          y: pixel.y,
          color: pixel.color,
        },
      })
    )
  );
}

export async function getAllPixels(): Promise<Pixel[]> {
  const pixels = await prisma.pixel.findMany();
  return pixels as Pixel[];
}
