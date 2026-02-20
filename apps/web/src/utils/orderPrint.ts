import type { TFunction } from 'i18next';
import { ORDER_STATUSES } from '@mise/shared';

interface OrderItem {
  recipeName?: string;
  name?: string;
  quantity: number;
  unitPrice?: number;
  price?: number;
}

interface OrderData {
  orderNumber: string | number;
  customerName?: string;
  status: number;
  createdAt?: string;
  dueDate?: string;
  totalAmount?: number;
  notes?: string;
  items?: OrderItem[];
}

/** Wrap a value in dir="ltr" so the browser bidi algorithm doesn't scramble numbers/dates in RTL context. */
function ltr(value: string | number): string {
  return `<span dir="ltr">${value}</span>`;
}

export function printOrder(
  order: OrderData,
  storeName: string,
  t: TFunction,
  currency: string,
  isRtl: boolean,
  formatDate: (date: string | Date) => string,
) {
  const dir = isRtl ? 'rtl' : 'ltr';
  const align = isRtl ? 'right' : 'left';
  const statusKey = ORDER_STATUSES[order.status] ?? 'received';

  const itemRows = (order.items ?? [])
    .map(
      (item) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5">${item.recipeName ?? item.name ?? '-'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;text-align:center;font-variant-numeric:tabular-nums">${ltr(item.quantity)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;text-align:${isRtl ? 'left' : 'right'};font-variant-numeric:tabular-nums">${ltr(`${currency}${(item.unitPrice ?? item.price ?? 0).toFixed(2)}`)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="${isRtl ? 'he' : 'en'}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <title>${t('orders.orderNum', 'Order')} #${order.orderNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Rubik',sans-serif; color:#1a1a1a; padding:24px; direction:${dir}; text-align:${align}; }
    .store { font-size:14px; color:#7a5028; margin-bottom:4px; }
    h1 { font-size:22px; margin-bottom:12px; }
    .meta { font-size:13px; color:#555; margin-bottom:16px; }
    .meta-row { display:flex; justify-content:space-between; padding:2px 0; }
    .meta-label { color:#888; }
    .meta-value { font-weight:500; }
    table { width:100%; border-collapse:collapse; margin-bottom:16px; }
    th { background:#b4783c; color:#fff; padding:8px 10px; text-align:${align}; font-size:13px; }
    th:nth-child(2) { text-align:center; }
    th:last-child { text-align:${isRtl ? 'left' : 'right'}; }
    .total-row td { font-weight:600; border-top:2px solid #b4783c; padding:8px 10px; }
    .notes { margin-top:16px; }
    .notes-label { font-weight:600; margin-bottom:4px; }
    .notes-text { font-size:13px; color:#555; white-space:pre-wrap; }
    @media print { body { padding:0; } }
  </style>
</head>
<body>
  <div class="store">${storeName}</div>
  <h1>${t('orders.orderNum', 'Order')} ${ltr(`#${order.orderNumber}`)}</h1>
  <div class="meta">
    ${order.customerName ? `<div class="meta-row"><span class="meta-label">${t('orders.customer', 'Customer')}</span><span class="meta-value">${order.customerName}</span></div>` : ''}
    <div class="meta-row"><span class="meta-label">${t('orders.statusLabel', 'Status')}</span><span class="meta-value">${t(`orders.status.${statusKey}`, statusKey)}</span></div>
    ${order.createdAt ? `<div class="meta-row"><span class="meta-label">${t('orders.createdAt', 'Created')}</span><span class="meta-value">${ltr(formatDate(order.createdAt))}</span></div>` : ''}
    ${order.dueDate ? `<div class="meta-row"><span class="meta-label">${t('orders.dueDate', 'Due Date')}</span><span class="meta-value">${ltr(formatDate(order.dueDate))}</span></div>` : ''}
  </div>
  ${
    order.items?.length
      ? `<table>
    <thead><tr>
      <th>${t('orders.recipe', 'Recipe')}</th>
      <th>${t('orders.qty', 'Qty')}</th>
      <th>${t('orders.price', 'Price')}</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
    <tfoot><tr class="total-row">
      <td></td>
      <td style="text-align:center">${t('orders.total', 'Total')}</td>
      <td style="text-align:${isRtl ? 'left' : 'right'};font-variant-numeric:tabular-nums">${ltr(`${currency}${(order.totalAmount ?? 0).toFixed(2)}`)}</td>
    </tr></tfoot>
  </table>`
      : ''
  }
  ${
    order.notes
      ? `<div class="notes">
    <div class="notes-label">${t('orders.notes', 'Notes')}</div>
    <div class="notes-text">${order.notes}</div>
  </div>`
      : ''
  }
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  // Wait for fonts to load then trigger print
  if (win.document.fonts?.ready) {
    win.document.fonts.ready.then(() => win.print());
  } else {
    win.onload = () => win.print();
  }
}
