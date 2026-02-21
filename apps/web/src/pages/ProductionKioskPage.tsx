import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Maximize, Minimize, Factory } from 'lucide-react';
import { useUpdateBatchStage } from '@/api/hooks';
import { apiClient } from '@/api/client';
import { KanbanBoard } from '@/components/production/KanbanBoard';

const REFRESH_INTERVAL = 30_000;

export default function ProductionKioskPage() {
  const { t } = useTranslation();
  const [selectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const qc = useQueryClient();
  const updateStage = useUpdateBatchStage();

  // Auto-refreshing query for kiosk mode
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['production', 'batches', selectedDate, 'kiosk'],
    queryFn: async () => {
      const { data } = await apiClient.get(`/production/batches?date=${selectedDate}`);
      return data.data ?? data;
    },
    refetchInterval: REFRESH_INTERVAL,
  });

  // Clock update
  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  const handleAdvance = useCallback((batchId: number, newStage: number) => {
    qc.setQueriesData<unknown[]>({ queryKey: ['production', 'batches'] }, (old) =>
      old?.map((b: any) => (b.id === batchId ? { ...b, stage: newStage } : b)),
    );
    updateStage.mutate({ id: batchId, stage: newStage });
  }, [qc, updateStage]);

  const timeStr = clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = clock.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="h-screen bg-neutral-900 text-white flex flex-col overflow-hidden">
      {/* Kiosk header */}
      <header className="flex items-center justify-between px-6 py-3 bg-neutral-800 border-b border-neutral-700">
        <div className="flex items-center gap-3">
          <Factory className="h-6 w-6 text-primary-400" />
          <span className="text-lg font-heading font-bold">{t('production.kiosk.title')}</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-end">
            <div className="text-2xl font-mono font-bold tabular-nums">{timeStr}</div>
            <div className="text-sm text-neutral-400">{dateStr}</div>
          </div>
          <button
            onClick={toggleFullscreen}
            className="rounded-lg bg-neutral-700 p-2.5 hover:bg-neutral-600 transition-colors"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Kanban board */}
      <main className="flex-1 min-h-0 p-4 flex flex-col overflow-hidden">
        <KanbanBoard
          batches={batches as any[]}
          isLoading={isLoading}
          variant="kiosk"
          onBatchClick={() => {}}
          onAdvance={handleAdvance}
        />
      </main>
    </div>
  );
}
