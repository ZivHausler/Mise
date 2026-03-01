import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, Section } from '@/components/Layout';
import { Button } from '@/components/Button';

interface DormantCustomer {
  id: number;
  name: string;
  phone: string;
  lastOrderDate: string;
  daysSinceLastOrder: number;
  totalOrders: number;
}

interface ReengagementWidgetProps {
  customers: DormantCustomer[];
}

const MAX_VISIBLE = 3;

export default function ReengagementWidget({ customers }: ReengagementWidgetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Hidden when no dormant customers
  if (customers.length === 0) return null;

  const visible = customers.slice(0, MAX_VISIBLE);
  const totalCount = customers.length;

  return (
    <Card>
      <Section
        title={t('loyalty.reengagement.title', 'Customers to Re-engage')}
      >
        <div className="flex flex-col gap-2">
          {visible.map((customer) => {
            const isWarning = customer.daysSinceLastOrder >= 30 && customer.daysSinceLastOrder < 60;
            const isError = customer.daysSinceLastOrder >= 60;
            const daysColor = isError
              ? 'text-error'
              : isWarning
                ? 'text-amber-600'
                : 'text-neutral-500';

            return (
              <div
                key={customer.id}
                className="flex items-center justify-between rounded-md border border-neutral-100 p-3"
              >
                <div
                  className="flex cursor-pointer flex-col gap-0.5"
                  onClick={() => navigate(`/customers/${customer.id}`)}
                >
                  <span className="text-body-sm font-medium text-neutral-800">{customer.name}</span>
                  <span className="text-caption text-neutral-500">
                    {t('loyalty.reengagement.lastOrder', 'Last order')}{' '}
                    <span className={daysColor}>
                      {t('loyalty.reengagement.daysSince', '{{count}} days ago', { count: customer.daysSinceLastOrder })}
                    </span>
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate(`/orders/new?customerId=${customer.id}`)}
                >
                  {t('loyalty.reengagement.newOrder', 'New Order')}
                </Button>
              </div>
            );
          })}
          {totalCount > MAX_VISIBLE && (
            <button
              onClick={() => navigate('/customers?segment=dormant')}
              className="text-center text-caption text-primary-600 hover:text-primary-700"
            >
              {t('loyalty.reengagement.viewAll', 'View All ({{count}})', { count: totalCount })}
            </button>
          )}
        </div>
      </Section>
    </Card>
  );
}
