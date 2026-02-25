import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Store, Mail, TrendingUp } from 'lucide-react';
import { useAdminAnalytics } from '@/api/hooks';
import { useAppStore } from '@/store/app';

type Range = 'week' | 'month' | 'year';

const GRAFANA_URL = import.meta.env['VITE_GRAFANA_URL'] || '/grafana';

const rangeToGrafana: Record<Range, string> = {
  week: 'now-7d',
  month: 'now-30d',
  year: 'now-1y',
};

function panelSrc(panelId: number, range: Range, dark: boolean) {
  return `${GRAFANA_URL}/d-solo/mise-admin/mise-admin-dashboard?orgId=1&panelId=${panelId}&from=${rangeToGrafana[range]}&to=now&theme=${dark ? 'dark' : 'light'}`;
}

function GrafanaPanel({ panelId, range, height = 300, className = '' }: { panelId: number; range: Range; height?: number; className?: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const dark = useAppStore((s) => s.adminDarkMode);

  const handleLoad = useCallback(() => {
    try {
      const doc = ref.current?.contentDocument;
      if (doc) {
        const style = doc.createElement('style');
        style.textContent = 'body, .react-grid-layout, .panel-container, .main-view, .scroll-canvas { background: transparent !important; }';
        doc.head.appendChild(style);
      }
    } catch { /* cross-origin fallback */ }
  }, []);

  return (
    <iframe
      key={`${panelId}-${dark}`}
      ref={ref}
      src={panelSrc(panelId, range, dark)}
      onLoad={handleLoad}
      width="100%"
      height={height}
      frameBorder="0"
      className={`rounded-xl ${className}`}
    />
  );
}

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const range = useAppStore((s) => s.adminDashboardRange);
  const setRange = useAppStore((s) => s.setAdminDashboardRange);
  const { data: analytics, isLoading } = useAdminAnalytics(range);

  const stats = [
    { label: t('admin.dashboard.totalUsers'), value: analytics?.totalUsers ?? 0, icon: Users, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300' },
    { label: t('admin.dashboard.totalStores'), value: analytics?.totalStores ?? 0, icon: Store, color: 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-300' },
    { label: t('admin.dashboard.activeInvitations'), value: analytics?.activeInvitations ?? 0, icon: Mail, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300' },
    { label: t('admin.dashboard.signupTrend'), value: analytics?.signupsPerDay?.length ?? 0, icon: TrendingUp, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300' },
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{t('admin.dashboard.title')}</h1>
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-700 rounded-lg p-1">
          {(['week', 'month', 'year'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                range === r ? 'bg-white dark:bg-neutral-600 shadow-sm text-neutral-900 dark:text-neutral-100 font-medium' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
            >
              {t(`admin.dashboard.range.${r}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* User Signups chart */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">{t('admin.dashboard.signupsChart')}</h2>
        <GrafanaPanel panelId={1} range={range} height={300} />
      </div>

      {/* Orders & Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">{t('admin.dashboard.ordersPerDay')}</h2>
          <GrafanaPanel panelId={6} range={range} height={280} />
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">{t('admin.dashboard.revenuePerDay')}</h2>
          <GrafanaPanel panelId={7} range={range} height={280} />
        </div>
      </div>

      {/* Financial stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-4">
          <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">{t('admin.dashboard.totalRevenue')}</h3>
          <GrafanaPanel panelId={8} range={range} height={100} />
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-4">
          <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">{t('admin.dashboard.avgOrderValue')}</h3>
          <GrafanaPanel panelId={9} range={range} height={100} />
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-4">
          <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">{t('admin.dashboard.outstandingBalance')}</h3>
          <GrafanaPanel panelId={10} range={range} height={100} />
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-4">
          <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">{t('admin.dashboard.activeStores')}</h3>
          <GrafanaPanel panelId={11} range={range} height={100} />
        </div>
      </div>

      {/* Pie charts & Stores over time */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">{t('admin.dashboard.ordersByStatus')}</h2>
          <GrafanaPanel panelId={12} range={range} height={260} />
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">{t('admin.dashboard.paymentsByMethod')}</h2>
          <GrafanaPanel panelId={13} range={range} height={260} />
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">{t('admin.dashboard.storesCreated')}</h2>
          <GrafanaPanel panelId={14} range={range} height={260} />
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">{t('admin.dashboard.topStores')}</h2>
          <GrafanaPanel panelId={15} range={range} height={300} />
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">{t('admin.dashboard.inactiveStores')}</h2>
          <GrafanaPanel panelId={16} range={range} height={300} />
        </div>
      </div>
    </div>
  );
}
