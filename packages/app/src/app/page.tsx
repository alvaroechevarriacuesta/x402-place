'use client';

import Canvas from '@/src/components/canvas';
import { useColor } from '@/src/app/_contexts/color-context';

export default function Home() {
  const { selectedColor } = useColor();

  return (
    <div className="w-full h-full">
      <Canvas selectedColor={selectedColor} />
    </div>
  );
}
