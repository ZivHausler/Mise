/** Convert a quantity from one unit to another (e.g. g→kg). Returns the multiplier to apply. */
export function unitConversionFactor(fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return 1;
  const conversions: Record<string, Record<string, number>> = {
    g:   { kg: 0.001 },
    kg:  { g: 1000 },
    ml:  { l: 0.001, liters: 0.001 },
    l:   { ml: 1000, liters: 1 },
    liters: { ml: 1000, l: 1 },
    pcs: { units: 1 },
    units: { pcs: 1 },
  };
  return conversions[fromUnit]?.[toUnit] ?? 1;
}
