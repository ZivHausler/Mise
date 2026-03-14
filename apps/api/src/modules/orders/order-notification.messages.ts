const MESSAGES: Record<string, { he: string; en: string }> = {
  '0_1':  { he: 'ההזמנה אושרה ומוכנה לטיפול', en: 'Order approved and being processed' },
  '0_5':  { he: 'ההזמנה בוטלה', en: 'Order was cancelled' },
  '1_2':  { he: 'ההזמנה בהכנה', en: 'Order is being prepared' },
  '2_1':  { he: 'ההזמנה חזרה לסטטוס התקבלה', en: 'Order moved back to received' },
  '2_3':  { he: 'ההזמנה מוכנה לאיסוף', en: 'Order is ready for pickup' },
  '3_2':  { he: 'ההזמנה חזרה להכנה', en: 'Order moved back to preparation' },
  '3_4':  { he: 'ההזמנה נמסרה', en: 'Order was delivered' },
  '4_3':  { he: 'ההזמנה חזרה לסטטוס מוכנה', en: 'Order moved back to ready' },
  'any_5': { he: 'ההזמנה בוטלה', en: 'Order was cancelled' },
  'any_6': { he: 'בקשת ביטול נשלחה וממתינה לאישור', en: 'Cancellation request sent, awaiting approval' },
  '6_decline': { he: 'בקשת הביטול נדחתה', en: 'Cancellation request was declined' },
};

export function getNotificationMessage(
  fromStatus: number | null,
  toStatus: number,
  declined?: boolean,
): string {
  if (declined) return MESSAGES['6_decline']?.he ?? '';

  // Try specific transition first
  const specificKey = `${fromStatus}_${toStatus}`;
  if (MESSAGES[specificKey]) return MESSAGES[specificKey]!.he;

  // Fall back to generic
  if (toStatus === 5) return MESSAGES['any_5']!.he;
  if (toStatus === 6) return MESSAGES['any_6']!.he;

  return 'סטטוס ההזמנה עודכן'; // fallback: "Order status updated"
}
