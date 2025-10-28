import { PixelUpdateEvent } from "../types/pixel";
import { prisma } from "./db";

export async function getEvents(since?: number, until?: number): Promise<PixelUpdateEvent[]> {
    
}