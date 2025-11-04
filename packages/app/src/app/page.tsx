'use client';

import CanvasWrapper from '@/components/canvas-wrapper';
import { useColor } from '@/app/_contexts/color-context';

export default function Home() {
  const { selectedColor } = useColor();

  return (
    <div className="w-full h-full">
      <CanvasWrapper selectedColor={selectedColor} />
    </div>
  );
}
