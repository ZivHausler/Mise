export type DateFormat = 'dd/mm/yyyy' | 'mm/dd/yyyy';

export function formatDate(date: string | Date, format: DateFormat): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return format === 'dd/mm/yyyy' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
}
