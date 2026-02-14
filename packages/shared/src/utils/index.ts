export function formatCurrency(amount: number, currency = 'ILS'): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: Date | string, locale = 'he-IL'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}
