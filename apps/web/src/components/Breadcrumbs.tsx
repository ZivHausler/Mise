import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface Breadcrumb {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: Breadcrumb[];
}

export const Breadcrumbs = React.memo(function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-body-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-neutral-400 rtl:scale-x-[-1]" />}
              {isLast || !item.path ? (
                <span className={cn(isLast ? 'font-semibold text-neutral-900' : 'text-neutral-500')}>
                  {item.label}
                </span>
              ) : (
                <Link to={item.path} className="text-primary-500 hover:underline">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});
