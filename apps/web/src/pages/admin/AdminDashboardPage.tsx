import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Store, Mail, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAdminAnalytics } from '@/api/hooks';

type Range = 'week' | 'month' | 'year';

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<Range>('month');
  const { data: analytics, isLoading } = useAdminAnalytics(range);

  const stats = [
    { label: t('admin.dashboard.totalUsers'), value: analytics?.totalUsers ?? 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: t('admin.dashboard.totalStores'), value: analytics?.totalStores ?? 0, icon: Store, color: 'text-green-600 bg-green-50' },
    { label: t('admin.dashboard.activeInvitations'), value: analytics?.activeInvitations ?? 0, icon: Mail, color: 'text-amber-600 bg-amber-50' },
    { label: t('admin.dashboard.signupTrend'), value: analytics?.signupsPerDay?.length ?? 0, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">{t('admin.dashboard.title')}</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-neutral-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Signups chart */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">{t('admin.dashboard.signupsChart')}</h2>
          <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
            {(['week', 'month', 'year'] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  range === r ? 'bg-white shadow-sm text-neutral-900 font-medium' : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {t(`admin.dashboard.range.${r}`)}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={analytics?.signupsPerDay ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <Tooltip />
            <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#eef2ff" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
