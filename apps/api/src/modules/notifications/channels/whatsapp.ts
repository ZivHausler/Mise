import type { NotificationChannel, NotificationRecipient, NotificationContext } from './channel.js';
import { appLogger } from '../../../core/logger/logger.js';
import { Language } from '@mise/shared';

const WHATSAPP_PHONE_NUMBER_ID = process.env['WHATSAPP_PHONE_NUMBER_ID'] ?? '';
const WHATSAPP_ACCESS_TOKEN = process.env['WHATSAPP_ACCESS_TOKEN'] ?? '';

const API_BASE = 'https://graph.facebook.com/v22.0';

// ---------------------------------------------------------------------------
// Translations keyed by Language enum
// ---------------------------------------------------------------------------

interface Translations {
  orderCreatedSubject: string;
  orderCreatedBody: string;
  lowStockSubject: string;
  lowStockBody: string;
  paymentReceivedSubject: string;
  paymentReceivedBody: string;
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
  phone: string;
  defaultItem: string;
  quantity: string;
}

const i18n: Record<Language, Translations> = {
  [Language.HEBREW]: {
    orderCreatedSubject: 'הזמנה חדשה התקבלה',
    orderCreatedBody: 'הזמנה חדשה בוצעה.',
    lowStockSubject: 'התראת מלאי נמוך',
    lowStockBody: 'המלאי הולך ואוזל.',
    paymentReceivedSubject: 'תשלום התקבל',
    paymentReceivedBody: 'התשלום עובד בהצלחה.',
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
    phone: 'טלפון',
    defaultItem: 'פריט',
    quantity: 'כמות',
  },
  [Language.ENGLISH]: {
    orderCreatedSubject: 'New Order Received',
    orderCreatedBody: 'A new order has been placed.',
    lowStockSubject: 'Low Stock Alert',
    lowStockBody: 'is running low.',
    paymentReceivedSubject: 'Payment Received',
    paymentReceivedBody: 'A payment has been successfully processed.',
    orderId: 'Order ID',
    customer: 'Customer',
    total: 'Total',
    items: 'Items',
    itemRunningLow: 'is running low.',
    currentQuantity: 'Current quantity',
    threshold: 'Threshold',
    amount: 'Amount',
    orderRef: 'Order',
    method: 'Method',
    phone: 'Phone',
    defaultItem: 'An item',
    quantity: 'Qty',
  },
  [Language.ARABIC]: {
    orderCreatedSubject: 'تم استلام طلب جديد',
    orderCreatedBody: 'تم تقديم طلب جديد.',
    lowStockSubject: 'تنبيه مخزون منخفض',
    lowStockBody: 'المخزون على وشك النفاد.',
    paymentReceivedSubject: 'تم استلام الدفع',
    paymentReceivedBody: 'تمت معالجة الدفع بنجاح.',
    orderId: 'رقم الطلب',
    customer: 'العميل',
    total: 'المجموع',
    items: 'العناصر',
    itemRunningLow: 'المخزون على وشك النفاد.',
    currentQuantity: 'الكمية الحالية',
    threshold: 'الحد الأدنى',
    amount: 'المبلغ',
    orderRef: 'الطلب',
    method: 'طريقة الدفع',
    phone: 'هاتف',
    defaultItem: 'عنصر',
    quantity: 'الكمية',
  },
};

function getTranslations(lang: number): Translations {
  return i18n[lang as Language] ?? i18n[Language.HEBREW];
}

// ---------------------------------------------------------------------------
// Phone formatting — Israeli 05XXXXXXXX → +97205XXXXXXXX
// ---------------------------------------------------------------------------

function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('972')) return `+${digits}`;
  if (digits.startsWith('0')) return `+972${digits.slice(1)}`;
  return `+${digits}`;
}

// ---------------------------------------------------------------------------
// Plain-text message builders per event type
// ---------------------------------------------------------------------------

function buildOrderCreated(t: Translations, p: Record<string, unknown>): string {
  const lines: string[] = [`*${t.orderCreatedSubject}*`, t.orderCreatedBody, ''];
  if (p['orderNumber']) lines.push(`${t.orderId}: #${p['orderNumber']}`);
  if (p['customerName']) lines.push(`${t.customer}: ${p['customerName']}`);
  if (p['customerPhone']) lines.push(`${t.phone}: ${p['customerPhone']}`);
  if (p['total'] != null) lines.push(`${t.total}: ₪${p['total']}`);

  const items = p['items'] as Array<{ name: string; quantity: number; unitPrice: number }> | undefined;
  if (items && items.length > 0) {
    lines.push('', `${t.items}:`);
    for (const item of items) {
      lines.push(`  • ${item.name} × ${item.quantity} — ₪${item.unitPrice * item.quantity}`);
    }
  }

  return lines.join('\n');
}

function buildLowStock(t: Translations, p: Record<string, unknown>): string {
  const itemName = (p['itemName'] ?? p['ingredientName'] ?? t.defaultItem) as string;
  const unitSuffix = p['unit'] ? ` ${p['unit']}` : '';
  const lines: string[] = [`*${t.lowStockSubject}*`, '', `*${itemName}* ${t.itemRunningLow}`];
  if (p['currentQuantity'] != null) lines.push(`${t.currentQuantity}: ${p['currentQuantity']}${unitSuffix}`);
  if (p['threshold'] != null) lines.push(`${t.threshold}: ${p['threshold']}${unitSuffix}`);
  return lines.join('\n');
}

function buildPaymentReceived(t: Translations, p: Record<string, unknown>): string {
  const lines: string[] = [`*${t.paymentReceivedSubject}*`, t.paymentReceivedBody, ''];
  if (p['amount'] != null) lines.push(`${t.amount}: ₪${p['amount']}`);
  if (p['orderNumber']) lines.push(`${t.orderRef}: #${p['orderNumber']}`);
  if (p['method']) lines.push(`${t.method}: ${p['method']}`);
  if (p['customerName']) lines.push(`${t.customer}: ${p['customerName']}`);
  return lines.join('\n');
}

function buildMessage(context: NotificationContext, lang: number): string {
  const t = getTranslations(lang);
  const p = context.payload;

  switch (context.eventType) {
    case 'order_created':    return buildOrderCreated(t, p);
    case 'low_stock':        return buildLowStock(t, p);
    case 'payment_received': return buildPaymentReceived(t, p);
    default:                 return `*${context.eventName}*\n${JSON.stringify(p, null, 2)}`;
  }
}

// ---------------------------------------------------------------------------
// WhatsApp Cloud API call
// ---------------------------------------------------------------------------

async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const url = `${API_BASE}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`WhatsApp API error ${res.status}: ${errorBody}`);
  }
}

// ---------------------------------------------------------------------------
// WhatsAppNotifier
// ---------------------------------------------------------------------------

export class WhatsAppNotifier implements NotificationChannel {
  async send(recipient: NotificationRecipient, context: NotificationContext): Promise<void> {
    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
      appLogger.warn(
        { to: recipient.phone, eventType: context.eventType },
        '[WHATSAPP] Notification NOT sent — WhatsApp is not configured',
      );
      return;
    }

    if (!recipient.phone) {
      appLogger.warn({ userId: recipient.userId, eventType: context.eventType }, '[WHATSAPP] No phone number for recipient');
      return;
    }

    const to = formatPhoneNumber(recipient.phone);
    const body = buildMessage(context, recipient.language ?? Language.HEBREW);

    try {
      await sendWhatsAppMessage(to, body);
      appLogger.info({ to, eventType: context.eventType }, '[WHATSAPP] Notification sent successfully');
    } catch (err) {
      appLogger.error({ to, eventType: context.eventType, err }, '[WHATSAPP] Failed to send notification');
    }
  }

  async sendBatch(recipients: NotificationRecipient[], context: NotificationContext): Promise<void> {
    for (const recipient of recipients) {
      await this.send(recipient, context);
    }
  }
}
