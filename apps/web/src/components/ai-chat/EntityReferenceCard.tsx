import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Users, BookOpen, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import { useAppStore } from '@/store/app';
import type { EntityReference, EntityType } from '@/api/useAiChat';

const ENTITY_CONFIG: Record<
  EntityType,
  {
    icon: typeof ClipboardList;
    borderClass: string;
    iconBgClass: string;
    iconColorClass: string;
    labelKey: string;
    getRoute: (id: string | number, displayName?: string) => string;
  }
> = {
  order: {
    icon: ClipboardList,
    borderClass: 'border-s-primary-400',
    iconBgClass: 'bg-primary-50',
    iconColorClass: 'text-primary-500',
    labelKey: 'chat.entityCards.order',
    getRoute: (id) => `/orders/${id}`,
  },
  customer: {
    icon: Users,
    borderClass: 'border-s-[#C2616B]',
    iconBgClass: 'bg-[#C2616B]/10',
    iconColorClass: 'text-[#C2616B]',
    labelKey: 'chat.entityCards.customer',
    getRoute: () => '/customers',
  },
  recipe: {
    icon: BookOpen,
    borderClass: 'border-s-success',
    iconBgClass: 'bg-success-light',
    iconColorClass: 'text-success',
    labelKey: 'chat.entityCards.recipe',
    getRoute: (id) => `/recipes/${id}`,
  },
  inventory: {
    icon: Package,
    borderClass: 'border-s-warning',
    iconBgClass: 'bg-warning-light',
    iconColorClass: 'text-warning',
    labelKey: 'chat.entityCards.inventory',
    getRoute: (_id, name) => name ? `/inventory?search=${encodeURIComponent(name)}&status=low,out` : '/inventory',
  },
};

const ORDER_STATUS_MAP: Record<string, { label: string; colorClass: string }> = {
  '0': { label: 'received', colorClass: 'bg-neutral-400' },
  '1': { label: 'in progress', colorClass: 'bg-warning' },
  '2': { label: 'ready', colorClass: 'bg-success' },
  '3': { label: 'delivered', colorClass: 'bg-primary-400' },
};

interface EntityReferenceCardProps {
  reference: EntityReference;
}

export const EntityReferenceCard = React.memo(function EntityReferenceCard({
  reference,
}: EntityReferenceCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const config = ENTITY_CONFIG[reference.type];
  if (!config) return null;
  const Icon = config.icon;

  const handleClick = useCallback(() => {
    const route = config.getRoute(reference.id, reference.displayName);
    navigate(route);

    // On mobile, close the chat panel after navigating
    if (window.innerWidth < 1024) {
      useAppStore.getState().setAiChatOpen(false);
    }
  }, [config, reference.id, navigate]);

  const orderStatus =
    reference.type === 'order' && reference.meta
      ? ORDER_STATUS_MAP[reference.meta]
      : null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex items-center gap-2 rounded-md border border-neutral-200 border-s-2 px-2.5 py-1.5',
        'bg-white shadow-sm transition-all',
        'hover:shadow-md hover:border-neutral-300',
        'focus:outline-none focus:ring-2 focus:ring-primary-400',
        config.borderClass,
      )}
      aria-label={`${t(config.labelKey)}: ${reference.displayName}`}
    >
      <div
        className={cn(
          'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded',
          config.iconBgClass,
        )}
      >
        <Icon className={cn('h-3.5 w-3.5', config.iconColorClass)} />
      </div>

      <div className="min-w-0 flex items-center gap-1.5">
        <span className="truncate text-caption font-medium text-neutral-800">
          {reference.displayName}
        </span>

        {reference.subtitle && (
          <span className="truncate text-caption text-neutral-500">
            {reference.subtitle}
          </span>
        )}

        {orderStatus && (
          <span
            className={cn('h-1.5 w-1.5 shrink-0 rounded-full', orderStatus.colorClass)}
            title={orderStatus.label}
          />
        )}
      </div>
    </button>
  );
});
