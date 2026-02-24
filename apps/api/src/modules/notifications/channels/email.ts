import { Resend } from 'resend';
import type { NotificationChannel, NotificationRecipient, NotificationContext } from './channel.js';
import { appLogger } from '../../../core/logger/logger.js';
import { Language } from '@mise/shared';

const RESEND_API_KEY = process.env['RESEND_API_KEY'];
const FROM_EMAIL = process.env['RESEND_FROM_EMAIL'] ?? 'Mise <no-reply@mise-en-place.shop>';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// ---------------------------------------------------------------------------
// Translations keyed by Language enum
// ---------------------------------------------------------------------------

interface Translations {
  orderCreatedSubject: string;
  orderCreatedBody: string;
  lowStockSubject: string;
  paymentReceivedSubject: string;
  paymentProcessedBody: string;
  orderId: string;
  customer: string;
  total: string;
  items: string;
  itemRunningLow: string;
  currentQuantity: string;
  threshold: string;
  amount: string;
  orderRef: string;
  method: string;
  defaultItem: string;
}

const i18n: Record<Language, Translations> = {
  [Language.HEBREW]: {
    orderCreatedSubject: 'הזמנה חדשה התקבלה',
    orderCreatedBody: 'הזמנה חדשה בוצעה.',
    lowStockSubject: 'התראת מלאי נמוך',
    paymentReceivedSubject: 'תשלום התקבל',
    paymentProcessedBody: 'התשלום עובד בהצלחה.',
    orderId: 'מספר הזמנה',
    customer: 'לקוח',
    total: 'סה"כ',
    items: 'פריטים',
    itemRunningLow: 'המלאי הולך ואוזל',
    currentQuantity: 'כמות נוכחית',
    threshold: 'סף מינימום',
    amount: 'סכום',
    orderRef: 'הזמנה',
    method: 'אמצעי תשלום',
    defaultItem: 'פריט',
  },
  [Language.ENGLISH]: {
    orderCreatedSubject: 'New Order Received',
    orderCreatedBody: 'A new order has been placed.',
    lowStockSubject: 'Low Stock Alert',
    paymentReceivedSubject: 'Payment Received',
    paymentProcessedBody: 'A payment has been successfully processed.',
    orderId: 'Order ID',
    customer: 'Customer',
    total: 'Total',
    items: 'Items',
    itemRunningLow: 'is running low.',
    currentQuantity: 'Current quantity',
    threshold: 'Threshold',
    amount: 'Amount',
    orderRef: 'Order Reference',
    method: 'Method',
    defaultItem: 'An item',
  },
  [Language.ARABIC]: {
    orderCreatedSubject: 'تم استلام طلب جديد',
    orderCreatedBody: 'تم تقديم طلب جديد.',
    lowStockSubject: 'تنبيه مخزون منخفض',
    paymentReceivedSubject: 'تم استلام الدفع',
    paymentProcessedBody: 'تمت معالجة الدفع بنجاح.',
    orderId: 'رقم الطلب',
    customer: 'العميل',
    total: 'المجموع',
    items: 'العناصر',
    itemRunningLow: 'المخزون على وشك النفاد.',
    currentQuantity: 'الكمية الحالية',
    threshold: 'الحد الأدنى',
    amount: 'المبلغ',
    orderRef: 'مرجع الطلب',
    method: 'طريقة الدفع',
    defaultItem: 'عنصر',
  },
};

function getTranslations(lang: number): Translations {
  return i18n[lang as Language] ?? i18n[Language.HEBREW];
}

function dir(lang: number): 'rtl' | 'ltr' {
  return lang === Language.HEBREW || lang === Language.ARABIC ? 'rtl' : 'ltr';
}

// ---------------------------------------------------------------------------
// Templates — one per event type, language-agnostic
// ---------------------------------------------------------------------------

function row(label: string, value: unknown, bold = false): string {
  const style = bold ? 'padding:6px 0;font-weight:600' : 'padding:6px 0';
  return `<tr><td style="padding:6px 0;color:#666">${label}</td><td style="${style}">${value}</td></tr>`;
}

function wrap(lang: number, content: string): string {
  return `<div dir="${dir(lang)}" style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">${content}</div>`;
}

function tableTemplate(lang: number, heading: string, headingColor: string, body: string, rows: string): string {
  return wrap(lang, `
    <h2 style="color:${headingColor}">${heading}</h2>
    ${body ? `<p>${body}</p>` : ''}
    <table style="width:100%;border-collapse:collapse;margin-top:12px">${rows}</table>
  `);
}

function buildOrderCreated(t: Translations, lang: number, p: Record<string, unknown>): { subject: string; html: string } {
  let rows = '';
  if (p['orderId']) rows += row(t.orderId, p['orderId'], true);
  if (p['customerName']) rows += row(t.customer, p['customerName']);
  if (p['total'] != null) rows += row(t.total, `₪${p['total']}`, true);
  if (p['itemCount'] != null) rows += row(t.items, p['itemCount']);

  return {
    subject: t.orderCreatedSubject,
    html: tableTemplate(lang, t.orderCreatedSubject, '#333', t.orderCreatedBody, rows),
  };
}

function buildLowStock(t: Translations, lang: number, p: Record<string, unknown>): { subject: string; html: string } {
  const itemName = (p['itemName'] ?? p['ingredientName'] ?? t.defaultItem) as string;
  const unitSuffix = p['unit'] ? ` ${p['unit']}` : '';

  let details = '';
  if (p['currentQuantity'] != null) details += `<p>${t.currentQuantity}: <strong>${p['currentQuantity']}</strong>${unitSuffix}</p>`;
  if (p['threshold'] != null) details += `<p>${t.threshold}: ${p['threshold']}${unitSuffix}</p>`;

  return {
    subject: t.lowStockSubject,
    html: wrap(lang, `
      <h2 style="color:#d97706">${t.lowStockSubject}</h2>
      <p><strong>${itemName}</strong> ${t.itemRunningLow}</p>
      ${details}
    `),
  };
}

function buildPaymentReceived(t: Translations, lang: number, p: Record<string, unknown>): { subject: string; html: string } {
  let rows = '';
  if (p['amount'] != null) rows += row(t.amount, `₪${p['amount']}`, true);
  if (p['orderId']) rows += row(t.orderRef, p['orderId']);
  if (p['method']) rows += row(t.method, p['method']);

  return {
    subject: t.paymentReceivedSubject,
    html: tableTemplate(lang, t.paymentReceivedSubject, '#059669', t.paymentProcessedBody, rows),
  };
}

function buildFallback(lang: number, context: NotificationContext): { subject: string; html: string } {
  return {
    subject: `Notification: ${context.eventName}`,
    html: wrap(lang, `
      <h2 style="color:#333">${context.eventName}</h2>
      <pre style="background:#f5f5f5;padding:12px;border-radius:4px;overflow-x:auto">${JSON.stringify(context.payload, null, 2)}</pre>
    `),
  };
}

// ---------------------------------------------------------------------------

function buildEmail(context: NotificationContext, lang: number): { subject: string; html: string } {
  const t = getTranslations(lang);
  const p = context.payload;

  switch (context.eventType) {
    case 'order_created':     return buildOrderCreated(t, lang, p);
    case 'low_stock':         return buildLowStock(t, lang, p);
    case 'payment_received':  return buildPaymentReceived(t, lang, p);
    default:                  return buildFallback(lang, context);
  }
}

export class EmailNotifier implements NotificationChannel {
  async send(recipient: NotificationRecipient, context: NotificationContext): Promise<void> {
    if (!resend) {
      appLogger.warn(
        { to: recipient.email, eventType: context.eventType, payload: context.payload },
        '[EMAIL] Notification NOT sent — RESEND_API_KEY is not configured',
      );
      return;
    }

    const lang = recipient.language ?? Language.HEBREW;
    const { subject, html } = buildEmail(context, lang);

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: recipient.email,
        subject,
        html,
      });

      if (error) {
        appLogger.error(
          { to: recipient.email, eventType: context.eventType, error },
          '[EMAIL] Failed to send notification',
        );
        return;
      }

      appLogger.info(
        { to: recipient.email, eventType: context.eventType, emailId: data?.id },
        '[EMAIL] Notification sent successfully',
      );
    } catch (err) {
      appLogger.error(
        { to: recipient.email, eventType: context.eventType, err },
        '[EMAIL] Unexpected error sending notification',
      );
    }
  }

  async sendBatch(recipients: NotificationRecipient[], context: NotificationContext): Promise<void> {
    if (recipients.length === 0) return;

    if (!resend) {
      appLogger.warn(
        { bcc: recipients.map((r) => r.email), eventType: context.eventType, payload: context.payload },
        '[EMAIL] Batch notification NOT sent — RESEND_API_KEY is not configured',
      );
      return;
    }

    // Use the first recipient's language for the shared email template
    const lang = recipients[0]!.language ?? Language.HEBREW;
    const { subject, html } = buildEmail(context, lang);

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: FROM_EMAIL,
        bcc: recipients.map((r) => r.email),
        subject,
        html,
      });

      if (error) {
        appLogger.error(
          { bcc: recipients.map((r) => r.email), eventType: context.eventType, error },
          '[EMAIL] Failed to send batch notification',
        );
        return;
      }

      appLogger.info(
        { bcc: recipients.map((r) => r.email), eventType: context.eventType, emailId: data?.id },
        '[EMAIL] Batch notification sent successfully',
      );
    } catch (err) {
      appLogger.error(
        { bcc: recipients.map((r) => r.email), eventType: context.eventType, err },
        '[EMAIL] Unexpected error sending batch notification',
      );
    }
  }
}
