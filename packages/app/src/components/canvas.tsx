'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePixelPayment } from '@/app/_hooks/use-pixel-payment';
import { useGetSnapshot } from '@/app/_hooks/use-get-snapshot';
import Minimap from '@/components/minimap';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

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
  
  // Load snapshot with changes applied
  const { canvas: snapshotCanvas, isLoadingSnapshot, error } = useGetSnapshot(gridWidth, gridHeight);

  // Grid state - stores the color of each pixel
  const gridRef = useRef<string[][]>(
    Array(gridHeight)
      .fill(null)
      .map(() => Array(gridWidth).fill('#FFFFFF'))
  );

  const hasInitializedView = useRef(false);
  const hasParsedSnapshot = useRef(false);

  // Pan and zoom state
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Viewport dimensions for minimap
  const [viewportDimensions, setViewportDimensions] = useState({
    width: 0,
    height: 0,
  });

  // WebSocket state and message queue
  const wsRef = useRef<WebSocket | null>(null);
  interface PixelUpdate {
    x: number;
    y: number;
    color: string;
  }
  const messageQueueRef = useRef<PixelUpdate[]>([]);
  
  // Redraw batching to prevent blocking during high activity
  const pendingRedrawRef = useRef<number | null>(null);

  // Drawing function
  const drawGrid = useCallback(() => {
    // Don't draw until view is initialized
    if (!hasInitializedView.current) return;
    
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

    // Draw grid lines only when zoomed in enough
    // Only show grid when individual pixels are reasonably visible
    if (scale >= 0.25) {
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
    }

    // Restore context state
    ctx.restore();
  }, [offset, scale, gridWidth, gridHeight, pixelSize]);

  // Batched redraw function - schedules a redraw on next animation frame
  const scheduleRedraw = useCallback(() => {
    // If a redraw is already scheduled, don't schedule another
    if (pendingRedrawRef.current !== null) return;

    pendingRedrawRef.current = requestAnimationFrame(() => {
      drawGrid();
      pendingRedrawRef.current = null;
    });
  }, [drawGrid]);

  // Parse snapshot canvas into grid when it's loaded (only once!)
  useEffect(() => {
    if (!snapshotCanvas || isLoadingSnapshot || hasParsedSnapshot.current) return;

    console.log('[Canvas] Parsing snapshot canvas into grid...');
    const ctx = snapshotCanvas.getContext('2d');
    if (!ctx) return;

    // Read pixel data from the snapshot canvas
    const imageData = ctx.getImageData(0, 0, gridWidth, gridHeight);
    const data = imageData.data;

    // Update the grid with colors from the snapshot canvas
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

    // Mark as parsed so this doesn't run again (preserving WebSocket updates)
    hasParsedSnapshot.current = true;

    console.log('[Canvas] Snapshot grid populated successfully');
    // Trigger a redraw (calling directly is fine, we only do this once)
    drawGrid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotCanvas, isLoadingSnapshot, gridWidth, gridHeight]); // drawGrid intentionally excluded

  // Helper function to apply pixel update
  const applyPixelUpdate = useCallback((pixelUpdate: PixelUpdate) => {
    const { x, y, color } = pixelUpdate;
    
    // Validate bounds
    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
      console.log('[Canvas] Applying pixel update:', { x, y, color });
      gridRef.current[y][x] = color;
      // Use batched redraw instead of immediate drawGrid()
      scheduleRedraw();
    }
  }, [gridWidth, gridHeight, scheduleRedraw]);

  // WebSocket connection - open immediately
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_WS_BASE_URL || 'http://localhost:3001';
    // Convert http(s) to ws(s) and adjust port (WS runs on PORT + 1)
    let wsUrl = baseUrl.replace(/^http/, 'ws');
    
    // If using default localhost, WS is on port 3002 (3001 + 1)
    if (wsUrl.includes('localhost:3001')) {
      wsUrl = wsUrl.replace('3001', '3002');
    }
    
    const wsFullUrl = `${wsUrl}/ws`;

    console.log('[Canvas] Connecting to WebSocket:', wsFullUrl);
    const ws = new WebSocket(wsFullUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Canvas] WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'pixel_update' && message.payload) {
          const pixelUpdate = message.payload as PixelUpdate;
          
          // Queue if loading snapshot
          if (isLoadingSnapshot) {
            console.log('[Canvas] Queuing pixel update during load:', pixelUpdate);
            messageQueueRef.current.push(pixelUpdate);
          } else {
            // Apply immediately (batched redraw handles smoothness)
            applyPixelUpdate(pixelUpdate);
          }
        }
      } catch (error) {
        console.error('[Canvas] Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[Canvas] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[Canvas] WebSocket disconnected');
    };

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [isLoadingSnapshot, applyPixelUpdate]); // Include dependencies

  // Process queued messages once snapshot is loaded
  useEffect(() => {
    if (!isLoadingSnapshot && messageQueueRef.current.length > 0) {
      console.log('[Canvas] Processing', messageQueueRef.current.length, 'queued pixel updates');
      
      messageQueueRef.current.forEach(pixelUpdate => {
        applyPixelUpdate(pixelUpdate);
      });
      
      // Clear the queue
      messageQueueRef.current = [];
    }
  }, [isLoadingSnapshot, applyPixelUpdate]);

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
        // Save the previous color for rollback if needed
        const previousColor = gridRef.current[gridY][gridX];

        // Optimistic update: immediately color the pixel
        gridRef.current[gridY][gridX] = selectedColor;
        scheduleRedraw();

        // Call the backend API
        const result = await placePixel({
          x: gridX,
          y: gridY,
          color: selectedColor,
        });

        // If the API call failed, roll back the color
        if (!result.success) {
          gridRef.current[gridY][gridX] = previousColor;
          scheduleRedraw();
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
      scheduleRedraw,
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
      const container = containerRef.current;
      if (!canvas || !container) return;

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

        // Calculate the minimum scale (fit to view)
        const containerRect = container.getBoundingClientRect();
        const gridPixelWidth = gridWidth * pixelSize;
        const gridPixelHeight = gridHeight * pixelSize;
        const scaleX = (containerRect.width * 0.9) / gridPixelWidth;
        const scaleY = (containerRect.height * 0.9) / gridPixelHeight;
        const minScale = Math.min(scaleX, scaleY);

        // Calculate zoom
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(Math.max(scale * zoomFactor, minScale * 0.95), 10);

        // Only update if scale actually changed
        if (Math.abs(newScale - scale) < 0.001) return;

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
    [scale, offset, gridWidth, gridHeight, pixelSize]
  );

  // Handle context menu (right-click)
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const zoomFactor = 1.15;
    const newScale = Math.min(scale * zoomFactor, 10);

    // Only update if scale actually changed
    if (Math.abs(newScale - scale) < 0.001) return;

    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const scaleChange = newScale / scale;
    const newOffset = {
      x: centerX - (centerX - offset.x) * scaleChange,
      y: centerY - (centerY - offset.y) * scaleChange,
    };

    setScale(newScale);
    setOffset(newOffset);
  }, [scale, offset]);

  const handleZoomOut = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Calculate the minimum scale (fit to view)
    const rect = container.getBoundingClientRect();
    const gridPixelWidth = gridWidth * pixelSize;
    const gridPixelHeight = gridHeight * pixelSize;
    const scaleX = (rect.width * 0.9) / gridPixelWidth;
    const scaleY = (rect.height * 0.9) / gridPixelHeight;
    const minScale = Math.min(scaleX, scaleY);

    const zoomFactor = 1 / 1.15;
    const newScale = Math.max(scale * zoomFactor, minScale * 0.95);

    // Only update if scale actually changed
    if (Math.abs(newScale - scale) < 0.001) return;

    const canvasRect = canvas.getBoundingClientRect();
    const centerX = canvasRect.width / 2;
    const centerY = canvasRect.height / 2;

    const scaleChange = newScale / scale;
    const newOffset = {
      x: centerX - (centerX - offset.x) * scaleChange,
      y: centerY - (centerY - offset.y) * scaleChange,
    };

    setScale(newScale);
    setOffset(newOffset);
  }, [scale, offset, gridWidth, gridHeight, pixelSize]);

  const handleResetView = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();

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
  }, [gridWidth, gridHeight, pixelSize]);

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

      // Update viewport dimensions for minimap
      setViewportDimensions({ width: rect.width, height: rect.height });

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      // Set initial view on first load - start with full grid visible
      if (!hasInitializedView.current) {
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
        
        // Mark as initialized - this will allow drawGrid to run
        hasInitializedView.current = true;
        
        // Draw the grid now that view is initialized
        setTimeout(() => drawGrid(), 0);
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

  // Cleanup pending animation frame on unmount
  useEffect(() => {
    return () => {
      if (pendingRedrawRef.current !== null) {
        cancelAnimationFrame(pendingRedrawRef.current);
      }
    };
  }, []);

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

      {/* Minimap with zoom controls */}
      {!isLoadingSnapshot && viewportDimensions.width > 0 && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-3">
          {/* Minimap */}
          <div>
            <Minimap
              gridWidth={gridWidth}
              gridHeight={gridHeight}
              pixelSize={pixelSize}
              offset={offset}
              scale={scale}
              viewportWidth={viewportDimensions.width}
              viewportHeight={viewportDimensions.height}
              gridRef={gridRef}
              onNavigate={(newOffset: { x: number; y: number }) => setOffset(newOffset)}
            />
          </div>

          {/* Zoom control buttons - below minimap */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={handleResetView}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Fit to View"
              aria-label="Fit to View"
            >
              <Maximize2 className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Snapshot loading overlay */}
      {isLoadingSnapshot && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-card rounded-lg shadow-xl p-6 text-center">
            <div className="flex flex-col gap-3 items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <div className="text-sm font-medium text-card-foreground">Loading canvas...</div>
              <div className="text-xs text-muted-foreground">
                Fetching snapshot and applying changes
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Snapshot error overlay */}
      {error && !isLoadingSnapshot && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-card rounded-lg shadow-xl p-6 text-center">
            <div className="flex flex-col gap-3 items-center">
              <div className="text-sm font-medium text-destructive">Failed to load canvas</div>
              <div className="text-xs text-muted-foreground">
                {error.message}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment processing overlay */}
      {isPaying && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-card rounded-lg shadow-xl p-6 text-center">
            <div className="flex flex-col gap-3 items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <div className="text-sm font-medium text-card-foreground">Processing payment...</div>
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
