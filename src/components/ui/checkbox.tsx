import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer grid size-[15px] shrink-0 place-items-center rounded-[4px] border border-black/25 bg-white shadow-[0_0.5px_1px_rgb(0_0_0/10%)] dark:border-white/25 dark:bg-white/10',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
        'data-[state=checked]:border-transparent data-[state=checked]:bg-primary data-[state=checked]:text-white dark:data-[state=checked]:border-transparent dark:data-[state=checked]:bg-primary',
        'data-[state=indeterminate]:border-transparent data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-white dark:data-[state=indeterminate]:border-transparent dark:data-[state=indeterminate]:bg-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {props.checked === 'indeterminate' ? (
          <Minus className="size-[11px]" strokeWidth={3} />
        ) : (
          <Check className="size-[11px]" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
