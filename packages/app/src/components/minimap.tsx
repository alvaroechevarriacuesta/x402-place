'use client';

import { useEffect, useRef, useCallback } from 'react';

interface MinimapProps {
  // Full canvas dimensions
  gridWidth: number;
  gridHeight: number;
  pixelSize: number;

  // Current viewport state
  offset: { x: number; y: number };
  scale: number;

  // Container size (actual canvas viewport size in pixels)
  viewportWidth: number;
  viewportHeight: number;

  // Grid data
  gridRef: React.RefObject<string[][]>;

  // Callback for navigation
  onNavigate?: (offset: { x: number; y: number }) => void;
}

export default function Minimap({
  gridWidth,
  gridHeight,
  pixelSize,
  offset,
  scale,
  viewportWidth,
  viewportHeight,
  gridRef,
  onNavigate,
}: MinimapProps) {
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Minimap size
  const minimapSize = 200; // Fixed size for minimap
  const padding = 8; // Padding inside minimap

  // Calculate the aspect ratio and drawing dimensions
  const fullGridWidth = gridWidth * pixelSize;
  const fullGridHeight = gridHeight * pixelSize;
  const aspectRatio = fullGridWidth / fullGridHeight;

  let drawWidth = minimapSize - padding * 2;
  let drawHeight = minimapSize - padding * 2;

  if (aspectRatio > 1) {
    drawHeight = drawWidth / aspectRatio;
  } else {
    drawWidth = drawHeight * aspectRatio;
  }

  // Draw the minimap
  const drawMinimap = useCallback(() => {
    const canvas = minimapRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#f4f4f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate starting position to center the grid
    const startX = padding + (minimapSize - padding * 2 - drawWidth) / 2;
    const startY = padding + (minimapSize - padding * 2 - drawHeight) / 2;

    // Draw the grid (simplified - sample every few pixels for performance)
    const sampleRate = Math.max(
      1,
      Math.floor(Math.min(gridWidth, gridHeight) / 100)
    );
    const pixelWidth = drawWidth / gridWidth;
    const pixelHeight = drawHeight / gridHeight;

    ctx.save();
    ctx.translate(startX, startY);

    const grid = gridRef.current;
    for (let y = 0; y < gridHeight; y += sampleRate) {
      for (let x = 0; x < gridWidth; x += sampleRate) {
        const color = grid[y][x];
        if (color !== '#FFFFFF') {
          // Only draw non-white pixels for performance
          ctx.fillStyle = color;
          ctx.fillRect(
            x * pixelWidth,
            y * pixelHeight,
            pixelWidth * sampleRate + 0.5,
            pixelHeight * sampleRate + 0.5
          );
        }
      }
    }

    // Draw viewport rectangle
    // Calculate viewport bounds in grid coordinates
    const viewportLeft = -offset.x / (pixelSize * scale);
    const viewportTop = -offset.y / (pixelSize * scale);
    const viewportRight = viewportLeft + viewportWidth / (pixelSize * scale);
    const viewportBottom = viewportTop + viewportHeight / (pixelSize * scale);

    // Convert to minimap coordinates
    const minimapX = viewportLeft * pixelWidth;
    const minimapY = viewportTop * pixelHeight;
    const minimapW = (viewportRight - viewportLeft) * pixelWidth;
    const minimapH = (viewportBottom - viewportTop) * pixelHeight;

    // Draw viewport rectangle with border
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(minimapX, minimapY, minimapW, minimapH);

    // Draw semi-transparent fill
    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
    ctx.fillRect(minimapX, minimapY, minimapW, minimapH);

    ctx.restore();

    // Draw border around minimap
    ctx.strokeStyle = '#d4d4d8';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  }, [
    gridWidth,
    gridHeight,
    pixelSize,
    offset,
    scale,
    viewportWidth,
    viewportHeight,
    gridRef,
    drawWidth,
    drawHeight,
  ]);

  // Handle click on minimap to navigate
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onNavigate) return;

      const canvas = minimapRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      // Calculate starting position (same as in draw)
      const startX = padding + (minimapSize - padding * 2 - drawWidth) / 2;
      const startY = padding + (minimapSize - padding * 2 - drawHeight) / 2;

      // Convert click position to grid coordinates
      const relativeX = clickX - startX;
      const relativeY = clickY - startY;

      const pixelWidth = drawWidth / gridWidth;
      const pixelHeight = drawHeight / gridHeight;

      const gridX = relativeX / pixelWidth;
      const gridY = relativeY / pixelHeight;

      // Calculate new offset to center the clicked position
      const newOffset = {
        x: -gridX * pixelSize * scale + viewportWidth / 2,
        y: -gridY * pixelSize * scale + viewportHeight / 2,
      };

      onNavigate(newOffset);
    },
    [
      onNavigate,
      gridWidth,
      gridHeight,
      pixelSize,
      scale,
      viewportWidth,
      viewportHeight,
      drawWidth,
      drawHeight,
    ]
  );

  // Setup canvas
  useEffect(() => {
    const canvas = minimapRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = minimapSize * dpr;
    canvas.height = minimapSize * dpr;
    canvas.style.width = `${minimapSize}px`;
    canvas.style.height = `${minimapSize}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    drawMinimap();
  }, [minimapSize, drawMinimap]);

  // Redraw when dependencies change
  useEffect(() => {
    drawMinimap();
  }, [drawMinimap]);

  return (
    <div
      ref={containerRef}
      className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800"
      style={{ width: minimapSize, height: minimapSize }}
    >
      <canvas
        ref={minimapRef}
        onClick={handleClick}
        className="cursor-pointer"
        style={{ display: 'block' }}
      />
    </div>
  );
}