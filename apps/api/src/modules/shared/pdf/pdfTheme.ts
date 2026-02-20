export const PDF_COLORS = {
  order: {
    storeNameText: [120, 80, 40] as [number, number, number],
    tableHeader: [180, 120, 60] as [number, number, number],
  },
  inventory: {
    tableHeader: [59, 130, 246] as [number, number, number],
  },
  shared: {
    tableFooterBg: [243, 244, 246] as [number, number, number],
    tableFooterText: [0, 0, 0] as [number, number, number],
    black: [0, 0, 0] as [number, number, number],
    muted: [80, 80, 80] as [number, number, number],
    mutedLight: [100, 100, 100] as [number, number, number],
  },
} as const;

export const PDF_LAYOUT = {
  margin: 14,
  titleFontSize: 20,
  subtitleFontSize: 16,
  bodyFontSize: 11,
  smallFontSize: 10,
  labelFontSize: 12,
} as const;
