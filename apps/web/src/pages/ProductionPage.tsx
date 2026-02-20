import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Factory, Plus, Wand2, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Page, PageHeader } from '@/components/Layout';
import { Button } from '@/components/Button';
import { useProductionBatches, useGenerateBatches, useUpdateBatchStage } from '@/api/hooks';
import { KanbanBoard } from '@/components/production/KanbanBoard';
import { TimelineView } from '@/components/production/TimelineView';
import { PrepListView } from '@/components/production/PrepListView';
import { CreateBatchModal } from '@/components/production/CreateBatchModal';
import { BatchDetailModal } from '@/components/production/BatchDetailModal';
import { useAppStore } from '@/store/app';
import { cn } from '@/utils/cn';

export default function ProductionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeTab = useAppStore((s) => s.productionTab);
  const setActiveTab = useAppStore((s) => s.setProductionTab);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const qc = useQueryClient();
  const { data: batches = [], isLoading } = useProductionBatches(selectedDate);
  const generateBatches = useGenerateBatches();
  const updateStage = useUpdateBatchStage();
  const hasAutoBatches = (batches as any[]).some((b: any) => b.source === 'auto');

  const handleStageChange = useCallback((id: string, newStage: number) => {
    // Update cache synchronously BEFORE calling mutate so there's no flicker
    qc.setQueriesData<unknown[]>({ queryKey: ['production', 'batches'] }, (old) =>
      old?.map((b: any) => (b.id === id ? { ...b, stage: newStage } : b)),
    );
    updateStage.mutate({ id, stage: newStage });
  }, [qc, updateStage]);

  const tabs: { id: TabId; labelKey: string }[] = [
    { id: 'board', labelKey: 'production.board' },
    { id: 'timeline', labelKey: 'production.timeline' },
    { id: 'prepList', labelKey: 'production.prepList' },
  ];

  const tabContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const el = tabRefs.current[activeTab];
    const container = tabContainerRef.current;
    if (el && container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setIndicator({
        left: elRect.left - containerRect.left,
        width: elRect.width,
      });
    }
  }, [activeTab]);

  const handleGenerate = () => {
    if (confirm(t('production.generateConfirm', { date: selectedDate }))) {
      generateBatches.mutate({ date: selectedDate! });
    }
  };

  const handleSetToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]!);
  };

  return (
    <Page className="flex flex-col h-full">
      <PageHeader
        title={t('production.title')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/production/kiosk')}>
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline ms-1">{t('production.kiosk.title')}</span>
            </Button>
            {!hasAutoBatches && (
              <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={generateBatches.isPending}>
                <Wand2 className="h-4 w-4" />
                <span className="hidden sm:inline ms-1">{t('production.generate')}</span>
              </Button>
            )}
            <Button size="sm" onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ms-1">{t('production.createBatch')}</span>
            </Button>
          </div>
        }
      />

      {/* Date picker + tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-body-sm bg-white dark:bg-neutral-800 dark:border-neutral-600"
          />
          <button
            onClick={handleSetToday}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-body-sm hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-700"
          >
            {t('production.today')}
          </button>
        </div>

        <div ref={tabContainerRef} className="relative flex flex-1 sm:flex-initial rounded-lg border border-neutral-200 bg-white dark:bg-neutral-800 dark:border-neutral-600 p-0.5">
          <div
            className="absolute top-0.5 bottom-0.5 rounded-md bg-primary-500 transition-all duration-300 ease-in-out"
            style={{ left: indicator.left, width: indicator.width }}
          />
          {tabs.map((tab) => (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[tab.id] = el; }}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative z-10 flex-1 sm:flex-initial rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors duration-300 text-center',
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-300'
              )}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'board' && (
        <div className="flex-1 min-h-0 flex flex-col">
          <KanbanBoard
            batches={batches as any[]}
            isLoading={isLoading}
            variant="default"
            onBatchClick={(id) => setSelectedBatchId(id)}
            onAdvance={handleStageChange}
          />
        </div>
      )}
      {activeTab === 'timeline' && (
        <TimelineView date={selectedDate} />
      )}
      {activeTab === 'prepList' && (
        <PrepListView date={selectedDate} />
      )}

      {createModalOpen && (
        <CreateBatchModal
          date={selectedDate}
          onClose={() => setCreateModalOpen(false)}
        />
      )}

      {selectedBatchId && (
        <BatchDetailModal
          batchId={selectedBatchId}
          onClose={() => setSelectedBatchId(null)}
        />
      )}
    </Page>
  );
}
