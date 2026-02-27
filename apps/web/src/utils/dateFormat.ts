import { useAppStore, type DateFormat, type TimeFormat } from '@/store/app';

export function formatDate(date: string | Date, format: DateFormat): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return format === 'dd/mm/yyyy' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
}

export function useFormatDate() {
  const dateFormat = useAppStore((s) => s.dateFormat);
  return (date: string | Date) => formatDate(date, dateFormat);
}

export function formatTime(date: string | Date, format: TimeFormat): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  if (format === '24h') return `${String(h).padStart(2, '0')}:${m}`;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
}

export function useFormatTime() {
  const timeFormat = useAppStore((s) => s.timeFormat);
  return (date: string | Date) => formatTime(date, timeFormat);
}

export function formatDateTime(date: string | Date, dateFormat: DateFormat, timeFormat: TimeFormat): string {
  return `${formatDate(date, dateFormat)} ${formatTime(date, timeFormat)}`;
}

export function useFormatDateTime() {
  const dateFormat = useAppStore((s) => s.dateFormat);
  const timeFormat = useAppStore((s) => s.timeFormat);
  return (date: string | Date) => formatDateTime(date, dateFormat, timeFormat);
}
