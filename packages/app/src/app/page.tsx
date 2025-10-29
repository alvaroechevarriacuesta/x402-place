'use client';

import { useRef, useEffect } from 'react';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1000, 1000);

    // Draw a simple grid to show the canvas is working
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    
    // Draw grid lines every 100 pixels
    for (let i = 0; i <= 1000; i += 100) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1000);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(1000, i);
      ctx.stroke();
    }
  }, []);

  return (
    <div className="flex items-center justify-center p-8 overflow-auto">
      <canvas
        ref={canvasRef}
        width={1000}
        height={1000}
        className="border border-zinc-300 dark:border-zinc-700 shadow-lg"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
