'use client';

import { useEffect, useState, useRef } from 'react';
import Canvas from './canvas';
import Minimap from './minimap';
import { ZoomIn, ZoomOut, Maximize2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface CanvasWrapperProps {
  gridWidth?: number;
  gridHeight?: number;
  pixelSize?: number;
  selectedColor: string;
  padding?: number; // Padding around the canvas in pixels
}

interface CanvasState {
  offset: { x: number; y: number };
  scale: number;
  viewportDimensions: { width: number; height: number };
  gridRef: React.RefObject<string[][]>;
  isLoadingSnapshot: boolean;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetView: () => void;
  setOffset: (offset: { x: number; y: number }) => void;
}

export default function CanvasWrapper({
  gridWidth = 1000,
  gridHeight = 1000,
  pixelSize = 20,
  selectedColor,
  padding = 32, // Default 32px padding on all sides
}: CanvasWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState<number>(0);
  const [canvasState, setCanvasState] = useState<CanvasState | null>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canvasState) return;
      
      // Check if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const panAmount = canvasState.viewportDimensions.height * 0.1;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          canvasState.setOffset({
            x: canvasState.offset.x,
            y: canvasState.offset.y + panAmount,
          });
          break;
        case 'ArrowDown':
          event.preventDefault();
          canvasState.setOffset({
            x: canvasState.offset.x,
            y: canvasState.offset.y - panAmount,
          });
          break;
        case 'ArrowLeft':
          event.preventDefault();
          canvasState.setOffset({
            x: canvasState.offset.x + panAmount,
            y: canvasState.offset.y,
          });
          break;
        case 'ArrowRight':
          event.preventDefault();
          canvasState.setOffset({
            x: canvasState.offset.x - panAmount,
            y: canvasState.offset.y,
          });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasState]);

  // Navigation handlers - pan by 10% of viewport
  const handlePanUp = () => {
    if (!canvasState) return;
    const panAmount = canvasState.viewportDimensions.height * 0.1;
    canvasState.setOffset({
      x: canvasState.offset.x,
      y: canvasState.offset.y + panAmount,
    });
  };

  const handlePanDown = () => {
    if (!canvasState) return;
    const panAmount = canvasState.viewportDimensions.height * 0.1;
    canvasState.setOffset({
      x: canvasState.offset.x,
      y: canvasState.offset.y - panAmount,
    });
  };

  const handlePanLeft = () => {
    if (!canvasState) return;
    const panAmount = canvasState.viewportDimensions.width * 0.1;
    canvasState.setOffset({
      x: canvasState.offset.x + panAmount,
      y: canvasState.offset.y,
    });
  };

  const handlePanRight = () => {
    if (!canvasState) return;
    const panAmount = canvasState.viewportDimensions.width * 0.1;
    canvasState.setOffset({
      x: canvasState.offset.x - panAmount,
      y: canvasState.offset.y,
    });
  };

  useEffect(() => {
    const calculateSize = () => {
      if (!containerRef.current) return;

      // Get the actual container dimensions
      const rect = containerRef.current.getBoundingClientRect();
      
      // Subtract padding on all sides (padding * 2 for both sides)
      const availableWidth = rect.width - (padding * 2);
      const availableHeight = rect.height - (padding * 2);

      // Calculate the square size as the minimum of available width and height
      const squareSize = Math.max(0, Math.min(availableWidth, availableHeight));

      setCanvasSize(squareSize);
    };

    // Initial calculation with a small delay to ensure the container is rendered
    const timeoutId = setTimeout(calculateSize, 0);

    // Recalculate on resize
    window.addEventListener('resize', calculateSize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculateSize);
    };
  }, [padding]);

  if (canvasSize === 0) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex items-center justify-center relative"
      style={{ 
        padding: `${padding}px`,
      }}
    >
      <div
        className="relative border-2 border-border rounded-lg shadow-lg overflow-hidden bg-background"
        style={{
          width: `${canvasSize}px`,
          height: `${canvasSize}px`,
        }}
      >
        <Canvas
          gridWidth={gridWidth}
          gridHeight={gridHeight}
          pixelSize={pixelSize}
          selectedColor={selectedColor}
          onStateChange={setCanvasState}
        />
      </div>

      {/* Controls panel - positioned outside the canvas, aligned with canvas bottom */}
      {canvasState && !canvasState.isLoadingSnapshot && canvasState.viewportDimensions.width > 0 && (
        <div 
          className="absolute right-4 flex flex-col gap-3 items-center"
          style={{
            bottom: `${padding}px`,
          }}
        >
          {/* Minimap */}
          <Minimap
            gridWidth={gridWidth}
            gridHeight={gridHeight}
            pixelSize={pixelSize}
            offset={canvasState.offset}
            scale={canvasState.scale}
            viewportWidth={canvasState.viewportDimensions.width}
            viewportHeight={canvasState.viewportDimensions.height}
            gridRef={canvasState.gridRef}
            onNavigate={(newOffset: { x: number; y: number }) => canvasState.setOffset(newOffset)}
          />

          {/* Zoom controls - longer buttons */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={canvasState.handleZoomOut}
              className="px-4 py-2 rounded-lg bg-background hover:bg-muted transition-colors border border-border shadow-sm"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={canvasState.handleZoomIn}
              className="px-4 py-2 rounded-lg bg-background hover:bg-muted transition-colors border border-border shadow-sm"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* Navigation D-pad with reset in center */}
          <div className="relative w-32 h-32">
            {/* Up button */}
            <button
              onClick={handlePanUp}
              className="absolute left-1/2 top-0 -translate-x-1/2 p-2 rounded-lg bg-background hover:bg-muted transition-colors border border-border shadow-sm"
              title="Pan Up (Arrow Up)"
              aria-label="Pan Up"
            >
              <ChevronUp className="w-5 h-5 text-foreground" />
            </button>

            {/* Down button */}
            <button
              onClick={handlePanDown}
              className="absolute left-1/2 bottom-0 -translate-x-1/2 p-2 rounded-lg bg-background hover:bg-muted transition-colors border border-border shadow-sm"
              title="Pan Down (Arrow Down)"
              aria-label="Pan Down"
            >
              <ChevronDown className="w-5 h-5 text-foreground" />
            </button>

            {/* Left button */}
            <button
              onClick={handlePanLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-background hover:bg-muted transition-colors border border-border shadow-sm"
              title="Pan Left (Arrow Left)"
              aria-label="Pan Left"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>

            {/* Right button */}
            <button
              onClick={handlePanRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-background hover:bg-muted transition-colors border border-border shadow-sm"
              title="Pan Right (Arrow Right)"
              aria-label="Pan Right"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>

            {/* Reset/Fit to View button in center */}
            <button
              onClick={canvasState.handleResetView}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-2 rounded-lg bg-background hover:bg-muted transition-colors border border-border shadow-sm"
              title="Fit to View"
              aria-label="Fit to View"
            >
              <Maximize2 className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

