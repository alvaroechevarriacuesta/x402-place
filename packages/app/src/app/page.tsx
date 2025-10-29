'use client';

import { useRef, useEffect, useState } from 'react';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [baseSize, setBaseSize] = useState(0);

  // Draw canvas content
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1000, 1000);

    // Draw grid lines for EVERY pixel (1000x1000 = 1 million pixels)
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 1000; i += 1) {
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

  // Calculate base size - make it larger so pixels are more visible
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Make canvas 2x the container size so you can see more detail
      // This means the 1000x1000 canvas will be rendered at 2x the viewport
      const size = Math.min(containerWidth, containerHeight) * 2;
      setBaseSize(size);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(0.1, prev * delta), 10));
  };

  // Handle pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex items-center justify-center overflow-hidden bg-zinc-100 dark:bg-zinc-900"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
    >
      <canvas
        ref={canvasRef}
        width={1000}
        height={1000}
        className="border border-zinc-300 dark:border-zinc-700 shadow-lg"
        style={{ 
          imageRendering: 'pixelated',
          width: `${baseSize}px`,
          height: `${baseSize}px`,
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: 'center',
        }}
      />
    </div>
  );
}
