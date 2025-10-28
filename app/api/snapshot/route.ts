import { NextResponse } from "next/server";
import { prisma } from "@/services/db/client";
import { put } from "@vercel/blob";

interface SnapshotRecord {
  id: bigint;
  timestamp: Date;
  blobUrl: string;
  metadata: string | null;
}

export async function POST() {
  try {
    // Fetch all pixels from the database
    const pixels = await prisma.pixel.findMany();

    if (pixels.length === 0) {
      return NextResponse.json(
        { success: false, error: "No pixels to snapshot" },
        { status: 400 }
      );
    }

    // Convert pixels to a JSON representation
    const pixelData = pixels.map((pixel) => ({
      x: pixel.x,
      y: pixel.y,
      color: pixel.color,
    }));

    // Create metadata
    const metadata = {
      pixelCount: pixels.length,
      timestamp: new Date().toISOString(),
      dimensions: {
        minX: Math.min(...pixels.map((p) => p.x)),
        maxX: Math.max(...pixels.map((p) => p.x)),
        minY: Math.min(...pixels.map((p) => p.y)),
        maxY: Math.max(...pixels.map((p) => p.y)),
      },
    };

    // Convert to JSON blob
    const jsonBlob = JSON.stringify({ pixels: pixelData, metadata });
    
    // Upload to Vercel Blob Storage
    const blob = await put(
      `snapshots/snapshot-${Date.now()}.json`,
      jsonBlob,
      {
        access: 'public',
        contentType: 'application/json',
      }
    );

    // Save snapshot URL to database
    // @ts-expect-error - Snapshot model exists but TS server may need reload
    const snapshot = await prisma.snapshot.create({
      data: {
        blobUrl: blob.url,
        metadata: JSON.stringify(metadata),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Snapshot created successfully",
      data: {
        id: snapshot.id.toString(),
        blobUrl: snapshot.blobUrl,
        timestamp: snapshot.timestamp,
        metadata,
      },
    });
  } catch (error) {
    console.error("Error creating snapshot:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to create snapshot: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Fetch all snapshots, most recent first
    // @ts-expect-error - Snapshot model exists but TS server may need reload
    const snapshots = await prisma.snapshot.findMany({
      orderBy: {
        timestamp: "desc",
      },
      take: 100, // Limit to last 100 snapshots
    });

    return NextResponse.json({
      success: true,
      data: snapshots.map((snapshot: SnapshotRecord) => ({
        id: snapshot.id.toString(),
        blobUrl: snapshot.blobUrl,
        timestamp: snapshot.timestamp,
        metadata: snapshot.metadata ? JSON.parse(snapshot.metadata) : null,
      })),
    });
  } catch (error) {
    console.error("Error fetching snapshots:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch snapshots: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
