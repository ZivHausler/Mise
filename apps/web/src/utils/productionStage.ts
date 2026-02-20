export const PRODUCTION_STAGE = {
  TO_PREP: 0,
  MIXING: 1,
  PROOFING: 2,
  BAKING: 3,
  COOLING: 4,
  READY: 5,
  PACKAGED: 6,
} as const;

export type ProductionStage = (typeof PRODUCTION_STAGE)[keyof typeof PRODUCTION_STAGE];

export const STAGE_KEYS = ['toPrep', 'mixing', 'proofing', 'baking', 'cooling', 'ready', 'packaged'] as const;

export function stageLabelKey(stage: number): string {
  return `production.stages.${STAGE_KEYS[stage] ?? 'toPrep'}`;
}

export const STAGE_COLORS: Record<number, { bg: string; text: string; border: string; darkBg: string; darkText: string }> = {
  0: { bg: 'bg-neutral-100', text: 'text-neutral-700', border: 'border-neutral-300', darkBg: 'bg-neutral-700', darkText: 'text-neutral-200' },
  1: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', darkBg: 'bg-blue-900', darkText: 'text-blue-200' },
  2: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', darkBg: 'bg-purple-900', darkText: 'text-purple-200' },
  3: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', darkBg: 'bg-orange-900', darkText: 'text-orange-200' },
  4: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300', darkBg: 'bg-cyan-900', darkText: 'text-cyan-200' },
  5: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', darkBg: 'bg-green-900', darkText: 'text-green-200' },
  6: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', darkBg: 'bg-emerald-900', darkText: 'text-emerald-200' },
};

export const STAGE_LEFT_BORDER_COLORS: Record<number, string> = {
  0: 'border-l-neutral-400',
  1: 'border-l-blue-500',
  2: 'border-l-purple-500',
  3: 'border-l-orange-500',
  4: 'border-l-cyan-500',
  5: 'border-l-green-500',
  6: 'border-l-emerald-500',
};

export const PRIORITY_LEVELS = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
} as const;

export type PriorityLevel = (typeof PRIORITY_LEVELS)[keyof typeof PRIORITY_LEVELS];

export const PRIORITY_KEYS = ['none', 'low', 'medium', 'high', 'urgent'] as const;

export const PRIORITY_CONFIG: Record<number, { border: string; bg: string; text: string; dot: string }> = {
  0: { border: 'border-l-neutral-300', bg: 'bg-neutral-100 dark:bg-neutral-700', text: 'text-neutral-500 dark:text-neutral-400', dot: 'bg-neutral-400' },
  1: { border: 'border-l-green-500', bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  2: { border: 'border-l-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  3: { border: 'border-l-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  4: { border: 'border-l-red-500', bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
};

export function getPriorityBorderColor(priority: number): string {
  if (priority >= 4) return PRIORITY_CONFIG[4]!.border;
  return PRIORITY_CONFIG[priority]?.border ?? PRIORITY_CONFIG[0]!.border;
}

export function getPriorityConfig(priority: number) {
  if (priority >= 4) return PRIORITY_CONFIG[4]!;
  return PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG[0]!;
}

export function priorityLabelKey(priority: number): string {
  const key = PRIORITY_KEYS[priority] ?? 'none';
  return `production.priorities.${key}`;
}
