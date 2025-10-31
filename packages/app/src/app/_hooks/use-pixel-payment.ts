import { useState, useCallback } from 'react';

interface PlacePixelParams {
  x: number;
  y: number;
  color: string;
}

interface PlacePixelResult {
  success: boolean;
  previousColor?: string;
}

export function usePixelPayment() {
  const [isPaying, setIsPaying] = useState(false);

  const placePixel = useCallback(async ({ x, y, color }: PlacePixelParams): Promise<PlacePixelResult> => {
    console.log('[usePixelPayment] Placing pixel:', { x, y, color });
    setIsPaying(true);

    try {
      // Get the base URL for the API (consistent with snapshot fetching)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
      
      const response = await fetch(`${baseUrl}/api/place`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ x, y, color }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to place pixel');
      }

      const result = await response.json();
      console.log('[usePixelPayment] Pixel placed successfully:', result);
      
      return { success: true };
    } catch (error) {
      console.error('[usePixelPayment] Failed to place pixel:', error);
      
      return { success: false };
    } finally {
      setIsPaying(false);
    }
  }, []);

  return {
    placePixel,
    isPaying,
  };
}

