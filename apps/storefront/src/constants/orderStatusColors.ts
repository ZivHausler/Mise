/**
 * Order status color map — semantic colors for all 7 order statuses.
 * Intentionally outside the theme system: status colors are fixed regardless of store theme.
 */

export interface StatusColorConfig {
  strip: string;
  stripOpacity: number;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  hasPulseDot: boolean;
  isTerminal: boolean;
  shadowColor: string;
}

export const ORDER_STATUS_COLORS: Record<number, StatusColorConfig> = {
  // Pending Approval
  0: {
    strip: '#F59E0B',
    stripOpacity: 1.0,
    badgeBg: 'rgba(245,158,11, 0.12)',
    badgeText: '#B45309',
    badgeBorder: 'rgba(245,158,11, 0.30)',
    hasPulseDot: true,
    isTerminal: false,
    shadowColor: '#F59E0B',
  },
  // Received
  1: {
    strip: '#3B82F6',
    stripOpacity: 1.0,
    badgeBg: 'rgba(59,130,246, 0.12)',
    badgeText: '#1D4ED8',
    badgeBorder: 'rgba(59,130,246, 0.30)',
    hasPulseDot: false,
    isTerminal: false,
    shadowColor: '#3B82F6',
  },
  // In Progress
  2: {
    strip: '#C4823E',
    stripOpacity: 1.0,
    badgeBg: 'rgba(196,130,62, 0.12)',
    badgeText: '#7A4D20',
    badgeBorder: 'rgba(196,130,62, 0.30)',
    hasPulseDot: true,
    isTerminal: false,
    shadowColor: '#C4823E',
  },
  // Ready
  3: {
    strip: '#22C55E',
    stripOpacity: 1.0,
    badgeBg: 'rgba(34,197,94, 0.12)',
    badgeText: '#15803D',
    badgeBorder: 'rgba(34,197,94, 0.30)',
    hasPulseDot: true,
    isTerminal: false,
    shadowColor: '#22C55E',
  },
  // Delivered
  4: {
    strip: '#22C55E',
    stripOpacity: 0.4,
    badgeBg: '',
    badgeText: '#15803D',
    badgeBorder: 'rgba(34,197,94, 0.40)',
    hasPulseDot: false,
    isTerminal: true,
    shadowColor: '#000000',
  },
  // Cancelled
  5: {
    strip: '#C47070',
    stripOpacity: 0.7,
    badgeBg: '',
    badgeText: '#C47070',
    badgeBorder: 'rgba(196,112,112, 0.50)',
    hasPulseDot: false,
    isTerminal: true,
    shadowColor: '#000000',
  },
  // Cancellation Requested
  6: {
    strip: '#F97316',
    stripOpacity: 1.0,
    badgeBg: 'rgba(249,115,22, 0.12)',
    badgeText: '#C2410C',
    badgeBorder: 'rgba(249,115,22, 0.30)',
    hasPulseDot: true,
    isTerminal: false,
    shadowColor: '#F97316',
  },
};

const FALLBACK_CONFIG: StatusColorConfig = {
  strip: '#9CA3AF',
  stripOpacity: 1.0,
  badgeBg: 'rgba(156,163,175, 0.12)',
  badgeText: '#6B7280',
  badgeBorder: 'rgba(156,163,175, 0.30)',
  hasPulseDot: false,
  isTerminal: false,
  shadowColor: '#000000',
};

export const ACTIVE_STATUSES = [0, 1, 2, 3, 6] as const;
export const TERMINAL_STATUSES = [4, 5] as const;
export const PULSE_STATUSES = [0, 2, 3, 6] as const;

export function getStatusConfig(status: number | undefined): StatusColorConfig {
  if (status === undefined) return FALLBACK_CONFIG;
  return ORDER_STATUS_COLORS[status] ?? FALLBACK_CONFIG;
}
