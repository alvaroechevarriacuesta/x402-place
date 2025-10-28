import { PixelUpdateEvent, Snapshot, Pixel } from "../types/pixel";
import { prisma } from "./db";

// Get all the events after a certain timestamp
export async function getEvents(since?: number, until?: number): Promise<PixelUpdateEvent[]> {
    // TODO: Implement fetching pixel update events from database between since and until timestamps
    return [];
}

export async function getLatestSnapshot(): Promise<Snapshot> {
    // TODO: Implement fetching the latest snapshot from the database
    return {
        id: 0,
        url: "",
        createdAt: 0,
    };
}

export async function saveSnapshot(snapshot: Snapshot): Promise<void> {
    // TODO: Implement saving the snapshot to the database
    return;
}

export async function saveEvents(events: PixelUpdateEvent[]): Promise<void> {
    // TODO: Implement saving the events to the database
    return;
}

export async function upsertPixels(pixels: Pixel[]): Promise<void> {
    return;
}

export async function getAllPixels(): Promise<Pixel[]> {
    return [];
}
