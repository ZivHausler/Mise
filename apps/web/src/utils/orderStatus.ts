export const ORDER_STATUS = { RECEIVED: 0, IN_PROGRESS: 1, READY: 2, DELIVERED: 3 } as const;
export const STATUS_LABELS = ['received', 'in_progress', 'ready', 'delivered'] as const;

/** Maps numeric status (0-3) to its string label for display/translation */
export function getStatusLabel(status: number): string {
  return STATUS_LABELS[status] ?? 'received';
}
