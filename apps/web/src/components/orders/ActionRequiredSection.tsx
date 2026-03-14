import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronUp, ChevronDown, BadgeDollarSign } from 'lucide-react';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/DataDisplay';
import { ORDER_STATUS, getStatusLabel } from '@/utils/orderStatus';

interface ActionRequiredSectionProps {
  pendingApprovals: any[];
  cancellationRequests: any[];
  onApprove: (order: any) => void;
  onDecline: (order: any) => void;
  onApproveCancellation: (order: any) => void;
  onDeclineCancellation: (order: any) => void;
  onCardClick: (order: any) => void;
  approvingId?: number | null;
  decliningId?: number | null;
  approvingCancelId?: number | null;
  decliningCancelId?: number | null;
  paymentStatuses?: Record<string, string>;
  formatDate: (date: string) => string;
}

interface ActionCardProps {
  order: any;
  type: 'approval' | 'cancellation';
  onPrimary: (order: any) => void;
  onSecondary: (order: any) => void;
  isPrimaryLoading: boolean;
  isSecondaryLoading: boolean;
  onClick: (order: any) => void;
  paymentStatus?: string;
  formatDate: (date: string) => string;
}

function ActionCard({
  order,
  type,
  onPrimary,
  onSecondary,
  isPrimaryLoading,
  isSecondaryLoading,
  onClick,
  paymentStatus,
  formatDate,
}: ActionCardProps) {
  const { t } = useTranslation();
  const isApproval = type === 'approval';
  const isLoading = isPrimaryLoading || isSecondaryLoading;

  const statusLabel = getStatusLabel(
    isApproval ? ORDER_STATUS.PENDING_APPROVAL : ORDER_STATUS.CANCELLATION_REQUESTED
  );

  return (
    <div
      onClick={() => onClick(order)}
      className={`w-full sm:w-[300px] sm:shrink-0 cursor-pointer rounded-lg border-2 transition-shadow hover:shadow-md ${
        isApproval
          ? 'border-amber-200 bg-amber-50/50'
          : 'border-orange-200 bg-orange-50/50'
      }`}
    >
      <div className="flex flex-col justify-between p-4 h-full">
        <div>
          {/* Header: status badge + order number */}
          <div className="flex items-center justify-between mb-2">
            <StatusBadge variant={statusLabel} label={t(`orders.status.${statusLabel}`, statusLabel)} />
            <span className="inline-flex items-center gap-1 text-caption font-medium text-neutral-500">
              #{order.orderNumber}
              {paymentStatus === 'paid' && (
                <BadgeDollarSign className="h-4 w-4 text-green-600" />
              )}
            </span>
          </div>

          {/* Customer name */}
          <p className="text-body-sm font-medium text-neutral-800 mb-1">
            {order.customer?.name ?? '-'}
          </p>

          {/* Due date + amount */}
          <div className="flex items-center justify-between text-caption text-neutral-500">
            <span>{order.dueDate ? formatDate(order.dueDate) : '-'}</span>
            <span className="font-mono">
              {order.totalAmount ?? 0} {t('common.currency')}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            variant={isApproval ? 'primary' : 'danger'}
            className={isApproval ? 'bg-green-600 hover:bg-green-700 flex-1 h-auto py-1' : 'flex-1 h-auto py-1'}
            loading={isPrimaryLoading}
            disabled={isLoading}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onPrimary(order);
            }}
          >
            {isApproval
              ? t('orders.approve')
              : t('orders.approveCancellation')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 h-auto py-1"
            loading={isSecondaryLoading}
            disabled={isLoading}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onSecondary(order);
            }}
          >
            {isApproval
              ? t('orders.declineOrder')
              : t('orders.declineCancellation')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export const ActionRequiredSection = React.memo(function ActionRequiredSection({
  pendingApprovals,
  cancellationRequests,
  onApprove,
  onDecline,
  onApproveCancellation,
  onDeclineCancellation,
  onCardClick,
  approvingId,
  decliningId,
  approvingCancelId,
  decliningCancelId,
  paymentStatuses,
  formatDate,
}: ActionRequiredSectionProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  const totalCount = pendingApprovals.length + cancellationRequests.length;

  if (totalCount === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-4">
      {/* Header */}
      <div className={`flex items-center justify-between ${collapsed ? '' : 'mb-3'}`}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h3 className="font-heading text-h4 text-neutral-800">
            {t('orders.actionRequired')}
          </h3>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-caption font-medium text-amber-700">
            {totalCount}
          </span>
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
          aria-label={collapsed ? t('orders.expandSection', 'Expand') : t('orders.collapseSection', 'Collapse')}
        >
          {collapsed ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronUp className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Subtitle */}
      {!collapsed && (
        <p className="text-body-sm text-neutral-500 mb-3">
          {t('orders.actionRequiredCount', { count: totalCount })}
        </p>
      )}

      {/* Card strip */}
      {!collapsed && (
        <div className="flex flex-col gap-3 sm:flex-row sm:overflow-x-auto sm:pb-1">
          {pendingApprovals.map((order) => (
            <ActionCard
              key={String(order.id)}
              order={order}
              type="approval"
              onPrimary={onApprove}
              onSecondary={onDecline}
              isPrimaryLoading={approvingId === order.id}
              isSecondaryLoading={decliningId === order.id}
              onClick={onCardClick}
              paymentStatus={paymentStatuses?.[order.id]}
              formatDate={formatDate}
            />
          ))}
          {cancellationRequests.map((order) => (
            <ActionCard
              key={String(order.id)}
              order={order}
              type="cancellation"
              onPrimary={onApproveCancellation}
              onSecondary={onDeclineCancellation}
              isPrimaryLoading={approvingCancelId === order.id}
              isSecondaryLoading={decliningCancelId === order.id}
              onClick={onCardClick}
              paymentStatus={paymentStatuses?.[order.id]}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
});
