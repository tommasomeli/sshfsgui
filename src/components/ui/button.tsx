import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-normal transition-[background-color,filter] active:brightness-90 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-[0_0.5px_1px_rgb(0_0_0/20%)] hover:brightness-105',
        destructive: 'bg-destructive text-destructive-foreground shadow-[0_0.5px_1px_rgb(0_0_0/20%)] hover:brightness-105',
        outline: 'bg-card text-foreground shadow-[0_0_0_0.5px_rgb(0_0_0/12%),0_0.5px_1.5px_rgb(0_0_0/15%)] dark:bg-white/12 dark:shadow-[0_0_0_0.5px_rgb(255_255_255/8%)] hover:brightness-[0.98] dark:hover:bg-white/16',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        ghost: 'text-foreground/75 hover:bg-accent hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-7 px-3 has-[>svg]:px-2.5',
        sm: 'h-6 rounded-[5px] px-2.5 has-[>svg]:px-2',
        lg: 'h-8 px-4 has-[>svg]:px-3',
        icon: 'size-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
