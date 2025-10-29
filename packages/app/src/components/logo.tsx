import React from 'react';
import Image from 'next/image';

import { cn } from '@/src/lib/utils';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  containerClassName?: string;
  onClick?: () => void;
  priority?: boolean;
}
export const Logo = React.forwardRef<HTMLDivElement, LogoProps>(
  ({ className, containerClassName, onClick, priority, ...props }, ref) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={containerClassName}
        {...props}
      >
        <Image
          src="/logo.png"
          alt="xPlace Logo"
          width={64}
          height={64}
          className={cn('dark:hidden', className)}
          priority={priority}
        />
        <Image
          src="/logo.png"
          alt="xPlace Logo"
          width={64}
          height={64}
          className={cn('hidden dark:block', className)}
          priority={priority}
        />
      </div>
    );
  }
);

Logo.displayName = 'Logo';
