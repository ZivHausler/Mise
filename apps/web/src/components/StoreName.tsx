import { useAuthStore } from '@/store/auth';

interface StoreNameProps {
  className?: string;
}

export function StoreName({ className }: StoreNameProps) {
  const stores = useAuthStore((s) => s.stores);
  const storeName = stores.length > 0 ? stores[0].storeName : null;

  if (!storeName) return null;

  return (
    <h1 className={className ?? 'text-xl font-bold text-neutral-900 tracking-tight'}>
      {storeName}
    </h1>
  );
}
