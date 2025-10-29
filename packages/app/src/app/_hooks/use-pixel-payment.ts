import { useState } from 'react';

interface PlacePixelParams {
  x: number;
  y: number;
  color: string;
}

export function usePixelPayment() {
  const [isPaying, setIsPaying] = useState(false);

  const placePixel = async ({ x, y, color }: PlacePixelParams) => {
    console.log('[usePixelPayment] Placing pixel:', { x, y, color });
    setIsPaying(false);
  };

  return {
    placePixel,
    isPaying,
  };
}

