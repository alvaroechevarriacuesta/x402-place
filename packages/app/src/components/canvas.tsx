'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePixelPayment } from '@/src/app/_hooks/use-pixel-payment';

interface CanvasProps {
  gridWidth?: number;
  gridHeight?: number;
  pixelSize?: number;
  selectedColor: string;
}

export default function Canvas({
  gridWidth = 1000,
  gridHeight = 1000,
  pixelSize = 20,
  selectedColor,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { placePixel, isPaying } = usePixelPayment();

  // Grid state - stores the color of each pixel
  const gridRef = useRef<string[][]>(
    Array(gridHeight)
      .fill(null)
      .map(() => Array(gridWidth).fill('#FFFFFF'))
  );

  // Loading state for snapshot
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(true);
  const hasLoadedSnapshot = useRef(false);
  const hasInitializedView = useRef(false);

  // Pan and zoom state
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Drawing function
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context state
    ctx.save();

    // Apply transformations
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw pixels
    const grid = gridRef.current;
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        ctx.fillStyle = grid[y][x];
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }

    // Draw grid lines
    ctx.strokeStyle = '#E5E5E5';
    ctx.lineWidth = 0.5 / scale;

    for (let x = 0; x <= gridWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(x * pixelSize, 0);
      ctx.lineTo(x * pixelSize, gridHeight * pixelSize);
      ctx.stroke();
    }

    for (let y = 0; y <= gridHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * pixelSize);
      ctx.lineTo(gridWidth * pixelSize, y * pixelSize);
      ctx.stroke();
    }

    // Restore context state
    ctx.restore();
  }, [offset, scale, gridWidth, gridHeight, pixelSize]);

  // Load snapshot from API once on mount
  useEffect(() => {
    // Only load once
    if (hasLoadedSnapshot.current) return;
    
    const loadSnapshot = async () => {
      try {
        console.log('[Canvas] Loading snapshot...');
        setIsLoadingSnapshot(true);
        hasLoadedSnapshot.current = true;
        
        // Fetch the PNG snapshot from the API
        const response = await fetch('/api/snapshot');
        
        if (!response.ok) {
          throw new Error('Failed to load snapshot');
        }

        // Get the image as a blob
        const blob = await response.blob();
        console.log('[Canvas] Snapshot blob size:', blob.size);
        
        // Create an image element to load the PNG
        const img = new Image();
        const url = URL.createObjectURL(blob);
        
        img.onload = () => {
          console.log('[Canvas] Snapshot image loaded, parsing pixels...');
          // Create a temporary canvas to read pixel data
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = gridWidth;
          tempCanvas.height = gridHeight;
          const tempCtx = tempCanvas.getContext('2d');
          
          if (tempCtx) {
            // Draw the image onto the temporary canvas
            tempCtx.drawImage(img, 0, 0);
            
            // Read pixel data from the image
            const imageData = tempCtx.getImageData(0, 0, gridWidth, gridHeight);
            const data = imageData.data;
            
            // Update the grid with colors from the image
            for (let y = 0; y < gridHeight; y++) {
              for (let x = 0; x < gridWidth; x++) {
                const idx = (y * gridWidth + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                // Convert RGB to hex color
                const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
                gridRef.current[y][x] = hex;
              }
            }
            
            console.log('[Canvas] Snapshot loaded successfully');
            // Note: drawGrid will be called by the drawGrid useEffect
          }
          
          // Clean up
          URL.revokeObjectURL(url);
          setIsLoadingSnapshot(false);
        };
        
        img.onerror = () => {
          console.error('[Canvas] Failed to load snapshot image');
          URL.revokeObjectURL(url);
          setIsLoadingSnapshot(false);
        };
        
        img.src = url;
      } catch (error) {
        console.error('[Canvas] Error loading snapshot:', error);
        setIsLoadingSnapshot(false);
      }
    };

    loadSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Handle canvas click to place pixel
  const handleCanvasClick = useCallback(
    async (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || isPanning || isPaying) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Convert mouse coordinates to grid coordinates
      const gridX = Math.floor((mouseX - offset.x) / (pixelSize * scale));
      const gridY = Math.floor((mouseY - offset.y) / (pixelSize * scale));

      // Check if click is within grid bounds
      if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
        try {
          await placePixel({
            x: gridX,
            y: gridY,
            color: selectedColor,
          });

          // Update local grid state on success
          gridRef.current[gridY][gridX] = selectedColor;
          drawGrid();
        } catch (error) {
          // Error is already handled by the mutation (toast shown)
          console.error('Failed to place pixel:', error);
        }
      }
    },
    [
      offset,
      scale,
      pixelSize,
      selectedColor,
      gridWidth,
      gridHeight,
      isPanning,
      isPaying,
      placePixel,
      drawGrid,
    ]
  );

  // Handle mouse down for panning
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (event.button === 1 || event.button === 2 || event.shiftKey) {
        event.preventDefault();
        setIsPanning(true);
        setLastMousePos({ x: event.clientX, y: event.clientY });
      }
    },
    []
  );

  // Handle mouse move for panning
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (isPanning) {
        const deltaX = event.clientX - lastMousePos.x;
        const deltaY = event.clientY - lastMousePos.y;

        setOffset(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));

        setLastMousePos({ x: event.clientX, y: event.clientY });
      }
    },
    [isPanning, lastMousePos]
  );

  // Handle mouse up for panning
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handle wheel for zooming and horizontal scrolling for panning
  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLCanvasElement>) => {
      event.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      // Check if there's horizontal scrolling
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        // Horizontal scroll - pan left/right
        setOffset(prev => ({
          x: prev.x - event.deltaX,
          y: prev.y - event.deltaY, // Also apply any vertical movement
        }));
      } else {
        // Vertical scroll - zoom
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Calculate zoom
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(Math.max(scale * zoomFactor, 0.1), 10);

        // Adjust offset to zoom towards mouse position
        const scaleChange = newScale / scale;
        const newOffset = {
          x: mouseX - (mouseX - offset.x) * scaleChange,
          y: mouseY - (mouseY - offset.y) * scaleChange,
        };

        setScale(newScale);
        setOffset(newOffset);
      }
    },
    [scale, offset]
  );

  // Handle context menu (right-click)
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
  }, []);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      // Fit the entire grid on initial load
      if (!hasInitializedView.current) {
        hasInitializedView.current = true;
        
        // Calculate the scale needed to fit the entire grid in the viewport
        const gridPixelWidth = gridWidth * pixelSize;
        const gridPixelHeight = gridHeight * pixelSize;
        
        // Add some padding (90% of viewport)
        const scaleX = (rect.width * 0.9) / gridPixelWidth;
        const scaleY = (rect.height * 0.9) / gridPixelHeight;
        const fitScale = Math.min(scaleX, scaleY);
        
        setScale(fitScale);
        
        // Center the grid
        setOffset({
          x: (rect.width - gridPixelWidth * fitScale) / 2,
          y: (rect.height - gridPixelHeight * fitScale) / 2,
        });
      } else {
        drawGrid();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [gridWidth, gridHeight, pixelSize, scale, offset, drawGrid]);

  // Redraw when dependencies change
  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        className={isPaying ? 'cursor-wait' : 'cursor-crosshair'}
        style={{ display: 'block' }}
      />

      {/* Snapshot loading overlay */}
      {isLoadingSnapshot && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 text-center">
            <div className="flex flex-col gap-3 items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <div className="text-sm font-medium">Loading canvas...</div>
              <div className="text-xs text-muted-foreground">
                Fetching pixel data from the database
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment processing overlay */}
      {isPaying && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 text-center">
            <div className="flex flex-col gap-3 items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <div className="text-sm font-medium">Processing payment...</div>
              <div className="text-xs text-muted-foreground">
                Please confirm the transaction in your wallet
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

