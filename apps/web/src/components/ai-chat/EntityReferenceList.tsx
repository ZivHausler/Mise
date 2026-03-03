import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import type { EntityReference } from '@/api/useAiChat';
import { EntityReferenceCard } from './EntityReferenceCard';

const MAX_VISIBLE = 4;

interface EntityReferenceListProps {
  references: EntityReference[];
}

export const EntityReferenceList = React.memo(function EntityReferenceList({
  references,
}: EntityReferenceListProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (!references.length) return null;

  const hasMore = references.length > MAX_VISIBLE;
  const visibleRefs = expanded ? references : references.slice(0, MAX_VISIBLE);
  const hiddenCount = references.length - MAX_VISIBLE;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {visibleRefs.map((ref, idx) => (
        <EntityReferenceCard key={`${ref.type}-${ref.id}-${idx}`} reference={ref} />
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className={cn(
            'rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5',
            'text-caption text-neutral-500',
            'hover:bg-neutral-100 transition-colors',
          )}
        >
          {expanded
            ? t('chat.entityCards.showLess')
            : t('chat.entityCards.showMore', { count: hiddenCount })}
        </button>
      )}
    </div>
  );
});
