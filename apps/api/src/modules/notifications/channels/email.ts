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
  phone: string;
  email: string;
  quantity: string;
  defaultItem: string;
  teamInviteSubject: string;
  teamInviteBody: string;
  storeInviteSubject: string;
  storeInviteBody: string;
  joinNow: string;
  roleName: string;
  storeName: string;
  invitedBy: string;
  asRole: string;
  roleOwner: string;
  roleManager: string;
  roleEmployee: string;
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
    phone: 'טלפון',
    email: 'אימייל',
    quantity: 'כמות',
    defaultItem: 'פריט',
    teamInviteSubject: 'יש לך הזמנה חדשה!',
    teamInviteBody: 'מישהו רוצה אותך בצוות שלו.',
    storeInviteSubject: 'מוזמן/ת לפתוח חנות ב-Mise!',
    storeInviteBody: 'קיבלת הזמנה בלעדית לפתוח חנות חדשה במערכת Mise — הכלי שיעזור לך לנהל הזמנות, מלאי ולקוחות במקום אחד.',
    joinNow: 'בואו נתחיל',
    roleName: 'תפקיד',
    storeName: 'חנות',
    invitedBy: 'הוזמנת להצטרף לצוות של',
    asRole: 'בתור',
    roleOwner: 'בעלים',
    roleManager: 'מנהל/ת',
    roleEmployee: 'חבר/ת צוות',
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
    orderRef: 'Order',
    method: 'Method',
    phone: 'Phone',
    email: 'Email',
    quantity: 'Qty',
    defaultItem: 'An item',
    teamInviteSubject: "You've got a new invitation!",
    teamInviteBody: "Someone wants you on their team.",
    storeInviteSubject: "You're invited to open a store on Mise!",
    storeInviteBody: "You've received an exclusive invitation to create your own store on Mise — the tool that helps you manage orders, inventory, and customers all in one place.",
    joinNow: "Let's Go",
    roleName: 'Role',
    storeName: 'Store',
    invitedBy: "You've been invited to join the team at",
    asRole: 'as',
    roleOwner: 'Owner',
    roleManager: 'Manager',
    roleEmployee: 'Team Member',
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
    orderRef: 'الطلب',
    method: 'طريقة الدفع',
    phone: 'هاتف',
    email: 'بريد إلكتروني',
    quantity: 'الكمية',
    defaultItem: 'عنصر',
    teamInviteSubject: 'لديك دعوة جديدة!',
    teamInviteBody: 'أحدهم يريدك في فريقه.',
    storeInviteSubject: 'أنت مدعو لفتح متجر على Mise!',
    storeInviteBody: 'لقد تلقيت دعوة حصرية لإنشاء متجرك الخاص على Mise — الأداة التي تساعدك على إدارة الطلبات والمخزون والعملاء في مكان واحد.',
    joinNow: 'هيا نبدأ',
    roleName: 'الدور',
    storeName: 'المتجر',
    invitedBy: 'تمت دعوتك للانضمام إلى فريق',
    asRole: 'بصفة',
    roleOwner: 'مالك',
    roleManager: 'مدير',
    roleEmployee: 'عضو فريق',
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
  if (p['orderNumber']) rows += row(t.orderId, `#${p['orderNumber']}`, true);
  if (p['customerName']) rows += row(t.customer, p['customerName']);
  if (p['customerPhone']) rows += row(t.phone, p['customerPhone']);
  if (p['customerEmail']) rows += row(t.email, p['customerEmail']);
  if (p['total'] != null) rows += row(t.total, `₪${p['total']}`, true);

  // Render ordered items list
  const items = p['items'] as Array<{ name: string; quantity: number; unitPrice: number }> | undefined;
  let itemsHtml = '';
  if (items && items.length > 0) {
    const itemRows = items
      .map((i) => `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee">${i.name}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:end">₪${i.unitPrice * i.quantity}</td></tr>`)
      .join('');
    itemsHtml = `
      <table style="width:100%;border-collapse:collapse;margin-top:16px;border:1px solid #eee;border-radius:4px">
        <thead><tr style="background:#f9fafb">
          <th style="padding:6px 8px;text-align:start;font-weight:600">${t.items}</th>
          <th style="padding:6px 8px;text-align:center;font-weight:600">${t.quantity}</th>
          <th style="padding:6px 8px;text-align:end;font-weight:600">${t.total}</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
      </table>`;
  }

  return {
    subject: t.orderCreatedSubject,
    html: wrap(lang, `
      <h2 style="color:#333">${t.orderCreatedSubject}</h2>
      ${t.orderCreatedBody ? `<p>${t.orderCreatedBody}</p>` : ''}
      <table style="width:100%;border-collapse:collapse;margin-top:12px">${rows}</table>
      ${itemsHtml}
    `),
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
  if (p['orderNumber']) rows += row(t.orderRef, `#${p['orderNumber']}`);
  if (p['method']) rows += row(t.method, p['method']);
  if (p['customerName']) rows += row(t.customer, p['customerName']);
  if (p['customerPhone']) rows += row(t.phone, p['customerPhone']);
  if (p['customerEmail']) rows += row(t.email, p['customerEmail']);

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

// ---------------------------------------------------------------------------
// Invitation email templates (bypass notification dispatcher)
// ---------------------------------------------------------------------------

function ctaButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;margin-top:16px">${label}</a>`;
}

function getRoleName(t: Translations, role: string | number): string {
  const roleNum = typeof role === 'string' ? Number(role) : role;
  switch (roleNum) {
    case 1: return t.roleOwner;
    case 2: return t.roleManager;
    case 3: return t.roleEmployee;
    default: return String(role);
  }
}

function buildTeamInvite(t: Translations, lang: number, params: { storeName: string; role: string | number; inviteLink: string }): { subject: string; html: string } {
  const roleName = getRoleName(t, params.role);
  return {
    subject: t.teamInviteSubject,
    html: wrap(lang, `
      <div style="text-align:center;padding:32px 0 16px">
        <div style="font-size:48px;margin-bottom:8px">🎉</div>
        <h2 style="color:#2563eb;margin:0">${t.teamInviteSubject}</h2>
      </div>
      <p style="font-size:16px;line-height:1.7;color:#374151;text-align:center">${t.invitedBy} <strong>${params.storeName}</strong> ${t.asRole} <strong>${roleName}</strong>.</p>
      <div style="text-align:center;margin:32px 0">${ctaButton(t.joinNow, params.inviteLink)}</div>
    `),
  };
}

function buildStoreInvite(t: Translations, lang: number, params: { inviteLink: string }): { subject: string; html: string } {
  return {
    subject: t.storeInviteSubject,
    html: wrap(lang, `
      <div style="text-align:center;padding:32px 0 16px">
        <div style="font-size:48px;margin-bottom:8px">🏪</div>
        <h2 style="color:#2563eb;margin:0">${t.storeInviteSubject}</h2>
      </div>
      <p style="font-size:16px;line-height:1.7;color:#374151;text-align:center">${t.storeInviteBody}</p>
      <div style="text-align:center;margin:32px 0">${ctaButton(t.joinNow, params.inviteLink)}</div>
    `),
  };
}

export async function sendInvitationEmail(params: {
  to: string;
  type: 'team_invite' | 'store_invite';
  inviteLink: string;
  storeName?: string;
  role?: string | number;
  lang?: number;
}): Promise<void> {
  if (!resend) {
    appLogger.warn(
      { to: params.to, type: params.type },
      '[EMAIL] Invitation NOT sent — RESEND_API_KEY is not configured',
    );
    return;
  }

  const lang = params.lang ?? Language.HEBREW;
  const t = getTranslations(lang);

  const { subject, html } =
    params.type === 'team_invite'
      ? buildTeamInvite(t, lang, { storeName: params.storeName ?? '', role: String(params.role ?? ''), inviteLink: params.inviteLink })
      : buildStoreInvite(t, lang, { inviteLink: params.inviteLink });

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject,
      html,
    });

    if (error) {
      appLogger.error({ to: params.to, type: params.type, error }, '[EMAIL] Failed to send invitation');
      return;
    }

    appLogger.info({ to: params.to, type: params.type, emailId: data?.id }, '[EMAIL] Invitation sent successfully');
  } catch (err) {
    appLogger.error({ to: params.to, type: params.type, err }, '[EMAIL] Unexpected error sending invitation');
  }
}

// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Invitation email helpers (used by StoreService)
// ---------------------------------------------------------------------------

interface InviteTranslations {
  joinSubject: (storeName: string) => string;
  joinBody: (storeName: string, role: string) => string;
  createSubject: string;
  createBody: string;
  acceptButton: string;
  createButton: string;
  copyLink: string;
  expiresOn: (date: string) => string;
  ignoreNotice: string;
}

const inviteI18n: Record<Language, InviteTranslations> = {
  [Language.HEBREW]: {
    joinSubject: (s) => `הוזמנת להצטרף ל-${s} ב-Mise`,
    joinBody: (s, r) => `הוזמנת להצטרף ל-<strong>${s}</strong> ב-Mise כ-<strong>${r}</strong>.`,
    createSubject: 'הוזמנת ליצור חנות ב-Mise',
    createBody: 'הוזמנת ליצור חנות חדשה ב-<strong>Mise</strong>.',
    acceptButton: 'קבל הזמנה',
    createButton: 'צור את החנות שלך',
    copyLink: 'או העתק את הקישור:',
    expiresOn: (d) => `ההזמנה תפוג בתאריך ${d}.`,
    ignoreNotice: 'אם לא ציפית להזמנה זו, ניתן להתעלם מהודעה זו.',
  },
  [Language.ENGLISH]: {
    joinSubject: (s) => `You've been invited to join ${s} on Mise`,
    joinBody: (s, r) => `You've been invited to join <strong>${s}</strong> on Mise as a <strong>${r}</strong>.`,
    createSubject: "You've been invited to create a store on Mise",
    createBody: "You've been invited to create a store on <strong>Mise</strong>.",
    acceptButton: 'Accept Invitation',
    createButton: 'Create Your Store',
    copyLink: 'Or copy this link:',
    expiresOn: (d) => `This invitation expires on ${d}.`,
    ignoreNotice: "If you didn't expect this invitation, you can safely ignore this email.",
  },
  [Language.ARABIC]: {
    joinSubject: (s) => `تمت دعوتك للانضمام إلى ${s} على Mise`,
    joinBody: (s, r) => `تمت دعوتك للانضمام إلى <strong>${s}</strong> على Mise بصفة <strong>${r}</strong>.`,
    createSubject: 'تمت دعوتك لإنشاء متجر على Mise',
    createBody: 'تمت دعوتك لإنشاء متجر جديد على <strong>Mise</strong>.',
    acceptButton: 'قبول الدعوة',
    createButton: 'أنشئ متجرك',
    copyLink: 'أو انسخ هذا الرابط:',
    expiresOn: (d) => `تنتهي صلاحية هذه الدعوة في ${d}.`,
    ignoreNotice: 'إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذا البريد الإلكتروني.',
  },
};

function getInviteTranslations(lang: number): InviteTranslations {
  return inviteI18n[lang as Language] ?? inviteI18n[Language.HEBREW];
}

function formatExpiry(expiresAt: Date): string {
  return expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function inviteWrap(lang: number, content: string): string {
  return `
    <div dir="${dir(lang)}" style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      <div style="padding:24px 0;border-bottom:1px solid #e5e5e5;margin-bottom:20px;">
        <strong style="font-size:18px;">Mise</strong>
      </div>
      ${content}
    </div>`;
}

export function buildStoreInviteEmail(storeName: string, inviteLink: string, role: string, expiresAt: Date, lang: number): { subject: string; html: string } {
  const t = getInviteTranslations(lang);
  return {
    subject: t.joinSubject(storeName),
    html: inviteWrap(lang, `
      <p>${t.joinBody(storeName, role)}</p>
      <p style="margin:24px 0;">
        <a href="${inviteLink}" style="background:#000;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">${t.acceptButton}</a>
      </p>
      <p style="font-size:13px;color:#666;">${t.copyLink} ${inviteLink}</p>
      <p style="font-size:13px;color:#666;">${t.expiresOn(formatExpiry(expiresAt))}</p>
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;font-size:12px;color:#888;">
        ${t.ignoreNotice}
      </div>`),
  };
}

export function buildCreateStoreInviteEmail(inviteLink: string, expiresAt: Date, lang: number): { subject: string; html: string } {
  const t = getInviteTranslations(lang);
  return {
    subject: t.createSubject,
    html: inviteWrap(lang, `
      <p>${t.createBody}</p>
      <p style="margin:24px 0;">
        <a href="${inviteLink}" style="background:#000;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">${t.createButton}</a>
      </p>
      <p style="font-size:13px;color:#666;">${t.copyLink} ${inviteLink}</p>
      <p style="font-size:13px;color:#666;">${t.expiresOn(formatExpiry(expiresAt))}</p>
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;font-size:12px;color:#888;">
        ${t.ignoreNotice}
      </div>`),
  };
}

export async function sendInviteEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    appLogger.warn({ to, subject }, '[EMAIL] Invite NOT sent — RESEND_API_KEY is not configured');
    return;
  }

  const { error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });

  if (error) {
    appLogger.error({ to, subject, error }, '[EMAIL] Failed to send invite email');
    throw new Error(`Failed to send invite email: ${error.message}`);
  }

  appLogger.info({ to, subject }, '[EMAIL] Invite email sent successfully');
}
