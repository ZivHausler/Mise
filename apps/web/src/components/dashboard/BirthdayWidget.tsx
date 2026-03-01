import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Cake } from 'lucide-react';
import { Card, Section } from '@/components/Layout';

interface BirthdayCustomer {
  id: number;
  name: string;
  phone: string;
  birthday: string;
  daysUntil: number;
}

interface BirthdayWidgetProps {
  birthdays: BirthdayCustomer[];
}

export default function BirthdayWidget({ birthdays }: BirthdayWidgetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Mobile: max 2 visible
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const maxVisible = isMobile ? 2 : birthdays.length;
  const visibleBirthdays = birthdays.slice(0, maxVisible);
  const hiddenCount = birthdays.length - maxVisible;

  if (birthdays.length === 0) {
    return (
      <Card>
        <Section title={t('loyalty.birthday.title', 'Upcoming Birthdays')}>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Cake className="h-10 w-10 text-neutral-300" />
            <p className="text-body-sm text-neutral-500">{t('loyalty.birthday.empty', 'No birthdays this week')}</p>
            <p className="text-caption text-neutral-400">{t('loyalty.birthday.emptyDesc', 'Add birthdays to customer profiles to see them here.')}</p>
          </div>
        </Section>
      </Card>
    );
  }

  return (
    <Card>
      <Section
        title={t('loyalty.birthday.title', 'Upcoming Birthdays')}
      >
        <div className="flex flex-col gap-2">
          {visibleBirthdays.map((customer) => (
            <div
              key={customer.id}
              onClick={() => navigate(`/customers/${customer.id}`)}
              className="flex cursor-pointer items-center justify-between rounded-md border border-neutral-100 p-3 hover:bg-primary-50"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-body-sm font-medium text-neutral-800">{customer.name}</span>
                <span className="text-caption text-neutral-500" dir="ltr">{customer.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                {customer.daysUntil === 0 ? (
                  <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-caption font-semibold text-primary-700">
                    {t('loyalty.birthday.today', 'Today!')}
                  </span>
                ) : customer.daysUntil === 1 ? (
                  <span className="text-caption text-neutral-500">
                    {t('loyalty.birthday.tomorrow', 'Tomorrow')}
                  </span>
                ) : (
                  <span className="text-caption text-neutral-500">
                    {t('loyalty.birthday.daysUntil', 'in {{count}} days', { count: customer.daysUntil })}
                  </span>
                )}
              </div>
            </div>
          ))}
          {hiddenCount > 0 && (
            <button
              onClick={() => navigate('/customers')}
              className="text-center text-caption text-primary-600 hover:text-primary-700"
            >
              +{hiddenCount} {t('common.showMore', 'more')}
            </button>
          )}
        </div>
      </Section>
    </Card>
  );
}
