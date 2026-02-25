import React from 'react';

interface TagBubblesProps {
  tags: string[];
  maxVisible?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function TagBubbles({ tags, maxVisible, size = 'md', className = '' }: TagBubblesProps) {
  const isMobile = window.innerWidth < 640;
  const limit = maxVisible ?? (isMobile ? 3 : 5);
  const visible = tags.slice(0, limit);
  const hiddenCount = tags.length - visible.length;

  const tagClass = size === 'sm'
    ? 'shrink-0 rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-caption font-medium text-primary-700'
    : 'shrink-0 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-body-sm font-medium text-primary-700';

  const badgeClass = size === 'sm'
    ? 'group relative shrink-0 cursor-default rounded-full border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-caption font-medium text-neutral-600'
    : 'group relative shrink-0 cursor-default rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-1 text-body-sm font-medium text-neutral-600';

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {visible.map((tag: string) => (
        <span key={tag} className={tagClass}>
          {tag}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className={badgeClass}>
          +{hiddenCount}
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-lg border border-neutral-200 bg-white px-3 py-2 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            <span className="flex flex-col gap-1">
              {tags.slice(limit).map((tag: string) => (
                <span key={tag} className="whitespace-nowrap text-body-sm text-neutral-700">{tag}</span>
              ))}
            </span>
          </span>
        </span>
      )}
    </div>
  );
}
