export { ORDER_STATUS } from '@mise/shared';

export const STATUS_LABELS: Record<number, string> = {
  0: 'pending_approval',
  1: 'received',
  2: 'in_progress',
  3: 'ready',
  4: 'delivered',
  5: 'cancelled',
  6: 'cancellation_requested',
};

/** Maps numeric status to its string label for display/translation */
export function getStatusLabel(status: number): string {
  return STATUS_LABELS[status] ?? 'received';
}
