import React from 'react';
import { cn } from '@/utils/cn';

interface PageProps {
  children: React.ReactNode;
  className?: string;
}

export const Page = React.memo(function Page({ children, className }: PageProps) {
  return (
    <main className={cn('mx-auto min-w-0 max-w-[1200px] px-4 py-6 md:px-6 md:py-8', className)}>
      {children}
    </main>
  );
});

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageHeader = React.memo(function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-heading text-h1 text-neutral-800">{title}</h1>
        {subtitle && <p className="mt-1 text-body-sm text-neutral-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
});

interface SectionProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const Section = React.memo(function Section({ children, title, actions, className }: SectionProps) {
  return (
    <section className={cn('mb-6', className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="font-heading text-h3 text-neutral-800">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
});

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'flat' | 'interactive';
  className?: string;
  onClick?: () => void;
}

const cardStyles = {
  default: 'bg-white border border-neutral-200 shadow-sm',
  elevated: 'bg-white shadow-md',
  flat: 'bg-primary-50',
  interactive: 'bg-white border border-neutral-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer',
};

export const Card = React.memo(function Card({ children, variant = 'default', className, onClick }: CardProps) {
  return (
    <div
      className={cn('rounded-lg p-6', cardStyles[variant], className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
});

export const CardHeader = React.memo(function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-center justify-between', className)}>{children}</div>
  );
});

export const CardContent = React.memo(function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('', className)}>{children}</div>;
});

export const CardFooter = React.memo(function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mt-4 flex items-center justify-end gap-2 border-t border-neutral-200 pt-4', className)}>
      {children}
    </div>
  );
});

interface StackProps {
  children: React.ReactNode;
  gap?: 1 | 2 | 3 | 4 | 6 | 8;
  className?: string;
}

const gapClasses = {
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
};

export const Stack = React.memo(function Stack({ children, gap = 4, className }: StackProps) {
  return <div className={cn('flex flex-col', gapClasses[gap], className)}>{children}</div>;
});

export const Row = React.memo(function Row({ children, gap = 4, className }: StackProps) {
  return <div className={cn('flex items-center', gapClasses[gap], className)}>{children}</div>;
});

export const Divider = React.memo(function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-neutral-200', className)} />;
});

export const Spacer = React.memo(function Spacer({ size = 4 }: { size?: 1 | 2 | 4 | 6 | 8 }) {
  const sizeClasses = { 1: 'h-1', 2: 'h-2', 4: 'h-4', 6: 'h-6', 8: 'h-8' };
  return <div className={sizeClasses[size]} />;
});
