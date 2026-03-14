/**
 * Shared date formatting helpers for the storefront app.
 */

export function formatDate(dateStr: string, language: string): string {
  const date = new Date(dateStr);
  const locale = language === 'he' ? 'he-IL' : 'en-US';
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

export function getRelativeDate(
  dateStr: string,
  language: string,
  t: (key: string, opts?: any) => string,
): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return formatDate(dateStr, language);
  }
  if (diffDays === 0) {
    return t('orders.relativeToday');
  }
  if (diffDays === 1) {
    return t('orders.relativeYesterday');
  }
  if (diffDays <= 6) {
    const locale = language === 'he' ? 'he-IL' : 'en-US';
    return date.toLocaleDateString(locale, { weekday: 'long' });
  }
  const locale = language === 'he' ? 'he-IL' : 'en-US';
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}
