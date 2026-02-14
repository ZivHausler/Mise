import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-body font-medium rounded-md transition-all duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-600',
        secondary: 'bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200',
        ghost: 'bg-transparent text-primary-700 hover:bg-primary-100',
        danger: 'bg-accent-500 text-white hover:bg-accent-600',
        link: 'bg-transparent text-primary-500 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-body-sm',
        md: 'h-10 px-4 text-body-sm',
        lg: 'h-12 px-6 text-body',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
  loading?: boolean;
}

export const Button = React.memo(function Button({
  variant,
  size,
  fullWidth,
  icon,
  iconPosition = 'start',
  loading,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const iconEl = loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon;

  return (
    <button
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {iconEl && iconPosition === 'start' && iconEl}
      {children}
      {iconEl && iconPosition === 'end' && iconEl}
    </button>
  );
});
