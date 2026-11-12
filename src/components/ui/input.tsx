import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-7 w-full min-w-0 rounded-md border-0 bg-card px-2 py-1 text-[13px] shadow-[0_0_0_0.5px_var(--input),inset_0_0.5px_1px_rgb(0_0_0/6%)] dark:bg-white/6 transition-[color,box-shadow] outline-none',
        'placeholder:text-muted-foreground',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
        'selection:bg-primary selection:text-primary-foreground',
        'focus-visible:ring-[3px] focus-visible:ring-ring',
        'aria-invalid:ring-destructive/20 aria-invalid:border-destructive',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
