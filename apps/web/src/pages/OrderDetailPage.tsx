import React, { useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Trash2, Edit, BadgeDollarSign, Download, Printer, FileText, RotateCcw } from 'lucide-react';
import { Page, Card, Section, Stack, Row } from '@/components/Layout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { StatusBadge } from '@/components/DataDisplay';
import { Button } from '@/components/Button';
import { PageSkeleton } from '@/components/Feedback';
import { ConfirmModal } from '@/components/Modal';
import { LogPaymentModal } from '@/components/LogPaymentModal';
import { RefundOrderModal } from '@/components/RefundOrderModal';
import { useOrder, useUpdateOrderStatus, useDeleteOrder, usePaymentStatuses, useOrderInvoices, useOrderPayments, useCurrentStore, downloadPdf } from '@/api/hooks';
import { GenerateInvoiceModal } from '@/components/invoices/GenerateInvoiceModal';
import { ORDER_STATUS, getStatusLabel } from '@/utils/orderStatus';
import { useFormatDate, useFormatTime } from '@/utils/dateFormat';
import { useAuthStore } from '@/store/auth';
import { useAppStore } from '@/store/app';
import { printOrder } from '@/utils/orderPrint';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const numId = id ? Number(id) : 0;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrder(numId);
  const updateOrderStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const { data: paymentStatuses } = usePaymentStatuses();
  const [showDelete, setShowDelete] = React.useState(false);
  const [showLogPayment, setShowLogPayment] = React.useState(false);
  const [showInvoice, setShowInvoice] = React.useState<'invoice' | 'credit_note' | null>(null);
  const [showRefund, setShowRefund] = React.useState(false);
  const { data: orderInvoices } = useOrderInvoices(numId);
  const { data: orderPayments } = useOrderPayments(numId);
  const { data: currentStore } = useCurrentStore();
  const hasTaxNumber = !!currentStore?.taxNumber;
  const autoInvoice = hasTaxNumber && !!currentStore?.autoGenerateInvoice;
  const autoCreditNote = hasTaxNumber && !!currentStore?.autoGenerateCreditNote;

  // Compute active (uncredited) invoice for the order
  const invoicesList = (orderInvoices ?? []) as any[];
  const creditedInvoiceIds = React.useMemo(() => {
    return new Set(invoicesList.filter((i: any) => i.type === 'credit_note').map((cn: any) => cn.originalInvoiceId));
  }, [invoicesList]);
  const activeInvoice = React.useMemo(() => {
    return invoicesList.find((i: any) => i.type === 'invoice' && !creditedInvoiceIds.has(i.id)) ?? null;
  }, [invoicesList, creditedInvoiceIds]);

  const formatDate = useFormatDate();
  const formatTime = useFormatTime();
  const storeName = useAuthStore((s) => s.stores[0]?.store?.name ?? '');
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const activeStoreId = useAuthStore((s) => s.activeStoreId);
  const storeRole = useAuthStore((s) => s.stores.find((st) => String(st.storeId) === String(activeStoreId))?.role ?? 3);
  const canRefund = isAdmin || storeRole <= 2;
  const language = useAppStore((s) => s.language);
  const isRtl = language === 'he';
  const currency = String(t('common.currency'));
  const o = order as any;

  const handleAdvance = useCallback(() => {
    if (!o || o.status >= ORDER_STATUS.DELIVERED) return;
    updateOrderStatus.mutate({ id: o.id, status: o.status + 1 });
  }, [o, updateOrderStatus]);

  const handleRevert = useCallback(() => {
    if (!o || o.status <= ORDER_STATUS.RECEIVED) return;
    updateOrderStatus.mutate({ id: o.id, status: o.status - 1 });
  }, [o, updateOrderStatus]);

  const handleDelete = useCallback(() => {
    if (!o) return;
    deleteOrder.mutate(o.id, { onSuccess: () => navigate('/orders') });
  }, [o, deleteOrder, navigate]);

  const dateFormat = useAppStore((s) => s.dateFormat);
  const handlePdf = useCallback(() => {
    if (!o) return;
    downloadPdf(`/orders/${o.id}/pdf?lang=${language}&dateFormat=${dateFormat}`, `order-${o.orderNumber}.pdf`);
  }, [o, language, dateFormat]);

  const handlePrint = useCallback(() => {
    if (!o) return;
    printOrder(o, storeName, t, currency, isRtl, formatDate);
  }, [o, storeName, t, currency, isRtl, formatDate]);

  if (isLoading) return <PageSkeleton />;
  if (!o) return null;

  return (
    <Page>
      <Breadcrumbs
        items={[
          { label: t('nav.orders'), path: '/orders' },
          { label: `#${o.orderNumber}` },
        ]}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-h1 text-neutral-800">
            {t('orders.orderNum', 'Order')} #{o.orderNumber}
          </h1>
          <StatusBadge variant={getStatusLabel(o.status)} label={t(`orders.status.${getStatusLabel(o.status)}`, getStatusLabel(o.status))} />
          {paymentStatuses?.[o.id] === 'paid' && (
            <Link to={`/payments?search=${encodeURIComponent(o.orderNumber)}`} title={t('payments.viewPayment', 'View payment')}>
              <BadgeDollarSign className="h-6 w-6 text-green-600 transition-colors hover:text-green-800" />
            </Link>
          )}
          {paymentStatuses?.[o.id] === 'refunded' && (
            <Link to={`/payments?search=${encodeURIComponent(o.orderNumber)}`} title={t('payments.refunded', 'Refunded')}>
              <BadgeDollarSign className="h-6 w-6 text-red-500 transition-colors hover:text-red-700" />
            </Link>
          )}
        </div>
        <Row gap={2} className="flex-wrap">
          {o.status > ORDER_STATUS.RECEIVED && (
            <Button
              variant="secondary"
              icon={<ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />}
              onClick={handleRevert}
              loading={updateOrderStatus.isPending}
            >
              {t('orders.revert', 'Back')}
            </Button>
          )}
          {o.status < ORDER_STATUS.DELIVERED && (
            <Button
              variant="primary"
              icon={<ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />}
              iconPosition="end"
              onClick={handleAdvance}
              loading={updateOrderStatus.isPending}
            >
              {t('orders.advance', 'Advance')}
            </Button>
          )}
          {paymentStatuses?.[o.id] !== 'paid' && paymentStatuses?.[o.id] !== 'refunded' && (
            <Button variant="secondary" icon={<BadgeDollarSign className="h-4 w-4" />} onClick={() => setShowLogPayment(true)}>
              {t('payments.logPayment', 'Log Payment')}
            </Button>
          )}
          {paymentStatuses?.[o.id] === 'paid' && canRefund && (
            <Button
              variant="danger"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={() => setShowRefund(true)}
            >
              {t('refund.refund', 'Refund')}
            </Button>
          )}
          {o.status <= ORDER_STATUS.IN_PROGRESS && paymentStatuses?.[o.id] !== 'paid' && (
            <Button variant="secondary" icon={<Edit className="h-4 w-4" />} onClick={() => navigate(`/orders/${o.id}/edit`)}>
              {t('common.edit')}
            </Button>
          )}
          {o.status < ORDER_STATUS.DELIVERED && (
            <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setShowDelete(true)}>
              {t('common.delete')}
            </Button>
          )}
        </Row>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <Section title={t('orders.details', 'Details')}>
            <Stack gap={3}>
              <div className="flex justify-between text-body-sm">
                <span className="text-neutral-500">{t('orders.customer', 'Customer')}</span>
                {o.customer?.id ? (
                  <Link to={`/customers/${o.customer.id}`} className="font-medium text-primary-600 hover:underline">
                    {o.customer?.name ?? '-'}
                  </Link>
                ) : (
                  <span className="font-medium text-neutral-800">{o.customer?.name ?? '-'}</span>
                )}
              </div>
              <DetailRow label={t('orders.createdAt', 'Created')} value={o.createdAt ? formatDate(o.createdAt) : '-'} />
              <DetailRow label={t('orders.dueDate', 'Due Date')} value={o.dueDate ? formatDate(o.dueDate) : '-'} />
              <DetailRow label={t('orders.total', 'Total')} value={`${o.totalAmount ?? 0} ${t('common.currency')}`} />
            </Stack>
          </Section>
        </Card>

        <Card>
          <Section title={t('orders.items', 'Items')}>
            {o.items?.length ? (
              <div className="overflow-hidden rounded-md border border-neutral-200">
                <table className="w-full text-body-sm">
                  <thead>
                    <tr className="border-b bg-neutral-100">
                      <th className="px-3 py-2 text-start font-semibold">{t('orders.recipe', 'Recipe')}</th>
                      <th className="px-3 py-2 text-end font-semibold">{t('orders.qty', 'Qty')}</th>
                      <th className="px-3 py-2 text-end font-semibold">{t('orders.price', 'Price')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.items.map((item: any, i: number) => (
                      <tr key={i} className="border-b border-neutral-100">
                        <td className="px-3 py-2">{item.recipeName ?? item.name ?? '-'}</td>
                        <td className="px-3 py-2 text-end font-mono">{item.quantity}</td>
                        <td className="px-3 py-2 text-end font-mono">{item.unitPrice ?? item.price ?? 0} {t('common.currency')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-body-sm text-neutral-400">{t('orders.noItems', 'No items')}</p>
            )}
          </Section>
        </Card>
      </div>

      {o.notes && (
        <Card className="mt-6">
          <Section title={t('orders.notes', 'Notes')}>
            <p className="text-body-sm text-neutral-600">{o.notes}</p>
          </Section>
        </Card>
      )}

      <Row gap={2} className="mt-6 flex-wrap">
        <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={handlePdf}>
          {t('orders.downloadPdf', 'PDF')}
        </Button>
        <Button variant="secondary" icon={<Printer className="h-4 w-4" />} onClick={handlePrint}>
          {t('orders.print', 'Print')}
        </Button>
      </Row>

      {(() => {
        const isPaid = paymentStatuses?.[o.id] === 'paid';
        const allDocs = invoicesList.slice().sort((a: any, b: any) => new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime());
        const canGenerateInvoice = isPaid && !activeInvoice && !autoInvoice;
        const canGenerateCreditNote = !!activeInvoice && !autoCreditNote;
        const showSection = allDocs.length > 0 || canGenerateInvoice || canGenerateCreditNote;

        if (!showSection) return null;

        return (
          <Card className="mt-6">
            <Section title={t('invoices.billingDocuments', 'Billing Documents')}>
              {allDocs.length > 0 ? (
                <div className="overflow-hidden rounded-md border border-neutral-200">
                  <table className="w-full text-body-sm">
                    <thead>
                      <tr className="border-b bg-neutral-100">
                        <th className="px-3 py-2 text-start font-semibold">{t('invoices.type', 'Type')}</th>
                        <th className="px-3 py-2 text-start font-semibold">{t('invoices.invoiceNumber', 'Number')}</th>
                        <th className="px-3 py-2 text-start font-semibold">{t('invoices.date', 'Date')}</th>
                        <th className="px-3 py-2 text-end font-semibold">{t('invoices.amount', 'Amount')}</th>
                        <th className="px-3 py-2 text-end font-semibold"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {allDocs.map((doc: any) => (
                        <tr key={doc.id} className="border-b border-neutral-100">
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              doc.type === 'credit_note'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-green-50 text-green-700'
                            }`}>
                              {doc.type === 'credit_note'
                                ? t('invoices.creditNote', 'Credit Note')
                                : t('invoices.taxInvoice', 'Tax Invoice')}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono">{doc.displayNumber}</td>
                          <td className="px-3 py-2">
                            {doc.issuedAt ? (
                              <>
                                {formatDate(doc.issuedAt)}
                                <span className="text-neutral-400 ms-1">
                                  {formatTime(doc.issuedAt)}
                                </span>
                              </>
                            ) : '-'}
                          </td>
                          <td className="px-3 py-2 text-end font-mono">{doc.pricing?.totalAmount ?? 0} {currency}</td>
                          <td className="px-3 py-2 text-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Download className="h-3.5 w-3.5" />}
                              onClick={() => downloadPdf(`/invoices/${doc.id}/pdf?lang=${language}`, `${doc.type === 'credit_note' ? 'credit-note' : 'invoice'}-${doc.displayNumber}.pdf`)}
                            >
                              {t('invoices.download', 'Download')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-body-sm text-neutral-400">{t('invoices.noDocumentsYet', 'No billing documents yet.')}</p>
              )}

              {(canGenerateInvoice || canGenerateCreditNote) && (
                <Row gap={2} className="mt-4">
                  {canGenerateInvoice && (
                    <Button variant="secondary" size="sm" icon={<FileText className="h-4 w-4" />} onClick={() => setShowInvoice('invoice')}>
                      {t('invoices.generate', 'Generate Invoice')}
                    </Button>
                  )}
                  {canGenerateCreditNote && (
                    <Button variant="secondary" size="sm" icon={<FileText className="h-4 w-4" />} onClick={() => setShowInvoice('credit_note')}>
                      {t('invoices.generateCreditNote', 'Generate Credit Note')}
                    </Button>
                  )}
                </Row>
              )}
            </Section>
          </Card>
        );
      })()}

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title={t('orders.deleteTitle', 'Delete Order?')}
        message={t('orders.deleteMsg', 'This action cannot be undone.')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        loading={deleteOrder.isPending}
      />

      <LogPaymentModal
        open={showLogPayment}
        onClose={() => setShowLogPayment(false)}
        preselectedOrderId={o.id}
      />

      {showInvoice && (
        <GenerateInvoiceModal
          isOpen={true}
          onClose={() => setShowInvoice(null)}
          order={{ id: o.id, orderNumber: o.orderNumber, customerName: o.customer?.name ?? '-', totalAmount: o.totalAmount ?? 0 }}
          type={showInvoice}
          originalInvoiceId={showInvoice === 'credit_note' ? activeInvoice?.id : undefined}
          isPaid={paymentStatuses?.[o.id] === 'paid'}
          payments={(orderPayments as any[]) ?? []}
        />
      )}

      <RefundOrderModal
        open={showRefund}
        onClose={() => setShowRefund(false)}
        order={{ id: o.id, orderNumber: o.orderNumber, customerName: o.customer?.name ?? '-', totalAmount: o.totalAmount ?? 0 }}
        invoice={activeInvoice}
        creditNoteExists={false}
        payments={(orderPayments as any[]) ?? []}
      />
    </Page>
  );
}

const DetailRow = React.memo(function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-body-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-800">{value}</span>
    </div>
  );
});
