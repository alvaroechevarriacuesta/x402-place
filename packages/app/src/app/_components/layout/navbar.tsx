'use client';

import Link from 'next/link';
import { Logo } from '@/src/components/logo';
import { ColorPicker } from '@/src/components/color-picker';
import { useColor } from '@/src/app/_contexts/color-context';

export function Navbar() {
  const { selectedColor, setSelectedColor } = useColor();

  return (
    <header className="w-full flex-shrink-0 bg-card border-b border-border">
      <div className="flex items-center justify-between w-full px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" prefetch={false} className="flex-shrink-0">
            <div className="w-10 h-10 p-1 bg-card rounded-md flex items-center justify-center">
              <Logo className="w-full h-full" />
            </div>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-bold text-card-foreground leading-tight">
              x402/place
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground leading-tight">
              Collaborative pixel canvas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <span className="text-xs md:text-sm font-medium text-muted-foreground">
            Color:
          </span>
          <ColorPicker 
            onColorChange={setSelectedColor}
            defaultColor={selectedColor}
          />
        </div>
      </div>
    </header>
  );
}

