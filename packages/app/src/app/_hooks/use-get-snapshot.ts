import { useState, useEffect } from 'react';

// Types
interface Snapshot {
  id: number;
  blobUrl: string;
  timestamp: number;
}

interface PixelUpdateEvent {
  event_id: string;
  x: number;
  y: number;
  color: string;
  ts: number;
  user_id?: string;
}

interface SnapshotData {
  canvas: HTMLCanvasElement | null;
  isLoadingSnapshot: boolean;
  error: Error | null;
}

export function useGetSnapshot(gridWidth = 1000, gridHeight = 1000) {
  const [data, setData] = useState<SnapshotData>({
    canvas: null,
    isLoadingSnapshot: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchSnapshotData = async () => {
      try {
        setData(prev => ({ ...prev, isLoadingSnapshot: true, error: null }));

        // BASE_URL from Railway needs NEXT_PUBLIC_ prefix for client-side access
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

        // Step 1: Get the latest snapshot metadata from backend
        console.log('[useGetSnapshot] Fetching snapshot metadata...');
        const snapshotResponse = await fetch(`${baseUrl}/api/snapshot`);

        if (!snapshotResponse.ok) {
          throw new Error(
            `Failed to fetch snapshot: ${snapshotResponse.statusText}`
          );
        }

        const snapshot: Snapshot = await snapshotResponse.json();
        console.log('[useGetSnapshot] Snapshot metadata:', snapshot);

        // Step 2: Fetch the PNG from Vercel blob store (public access)
        console.log('[useGetSnapshot] Fetching PNG from:', snapshot.blobUrl);
        const imageResponse = await fetch(snapshot.blobUrl);

        if (!imageResponse.ok) {
          throw new Error(
            `Failed to fetch snapshot image: ${imageResponse.statusText}`
          );
        }

        const imageBlob = await imageResponse.blob();
        console.log('[useGetSnapshot] PNG blob size:', imageBlob.size);

        // Create an Image object from the blob
        const img = new Image();
        const imageUrl = URL.createObjectURL(imageBlob);

        // Wait for image to load
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            console.log('[useGetSnapshot] PNG loaded successfully');
            resolve();
          };
          img.onerror = () => {
            reject(new Error('Failed to load PNG image'));
          };
          img.src = imageUrl;
        });

        // Step 3: Create a temporary canvas and draw the PNG onto it
        console.log('[useGetSnapshot] Creating canvas and parsing PNG...');
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = gridWidth;
        tempCanvas.height = gridHeight;
        const ctx = tempCanvas.getContext('2d');

        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Draw the PNG image onto the canvas
        ctx.drawImage(img, 0, 0, gridWidth, gridHeight);
        console.log('[useGetSnapshot] PNG drawn to canvas');

        // Clean up the blob URL
        URL.revokeObjectURL(imageUrl);

        // Step 4: Fetch the latest changes since snapshot timestamp until now
        const now = Date.now();
        console.log(
          '[useGetSnapshot] Fetching changes from',
          snapshot.timestamp,
          'to',
          now
        );

        const changesResponse = await fetch(
          `${baseUrl}/api/history?since=${snapshot.timestamp}&until=${now}`
        );

        let changes: PixelUpdateEvent[] = [];

        if (changesResponse.ok) {
          changes = await changesResponse.json();
          console.log('[useGetSnapshot] Fetched', changes.length, 'changes');
        } else {
          console.warn(
            '[useGetSnapshot] Failed to fetch changes, continuing without them'
          );
        }

        // Step 5: Apply the changes to the canvas
        if (changes.length > 0) {
          console.log(
            '[useGetSnapshot] Applying',
            changes.length,
            'changes to canvas'
          );

          changes.forEach(change => {
            // Parse the hex color and draw a single pixel
            const color = change.color;
            ctx.fillStyle = color;
            ctx.fillRect(change.x, change.y, 1, 1);
          });

          console.log('[useGetSnapshot] Changes applied to canvas');
        }

        // Update state if component is still mounted
        if (isMounted) {
          setData({
            canvas: tempCanvas,
            isLoadingSnapshot: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('[useGetSnapshot] Error:', error);
        if (isMounted) {
          setData(prev => ({
            ...prev,
            isLoadingSnapshot: false,
            error: error instanceof Error ? error : new Error('Unknown error'),
          }));
        }
      }
    };

    fetchSnapshotData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [gridWidth, gridHeight]); // Re-fetch if grid dimensions change

  return data;
}
