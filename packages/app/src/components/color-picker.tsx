'use client';

import { useState } from 'react';

interface ColorPickerProps {
  onColorChange?: (color: string) => void;
  defaultColor?: string;
}

export function ColorPicker({ onColorChange, defaultColor = '#0052FF' }: ColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState(defaultColor);

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    onColorChange?.(color);
  };

  return (
    <div className="relative">
      <label 
        className="size-8 md:size-9 rounded-md border-2 border-zinc-300 dark:border-zinc-700 shadow-sm hover:scale-105 transition-transform cursor-pointer block"
        style={{ backgroundColor: selectedColor }}
        title="Select color"
      >
        <input
          type="color"
          value={selectedColor}
          onChange={(e) => handleColorChange(e.target.value)}
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
        />
      </label>
    </div>
  );
}

