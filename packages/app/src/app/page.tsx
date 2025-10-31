'use client';

import Canvas from '@/components/canvas';
import { useColor } from '@/app/_contexts/color-context';

export default function Home() {
  const { selectedColor } = useColor();

  return (
    <div className="w-full h-full">
      <Canvas selectedColor={selectedColor} />
    </div>
  );
}
