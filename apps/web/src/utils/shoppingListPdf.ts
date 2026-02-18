import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DateFormat } from '@/store/app';
import { formatDate } from '@/utils/dateFormat';
import type { TFunction } from 'i18next';

interface LowStockItem {
  name: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  costPerUnit: number | null;
}

function round(n: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// jsPDF has no RTL support — Hebrew characters must be visually reversed.
const HEBREW_RANGE = /[\u0590-\u05FF]/;

function fixRtl(text: string): string {
  if (!HEBREW_RANGE.test(text)) return text;

  type RunType = 'hebrew' | 'ltr' | 'space';
  const runs: { text: string; type: RunType }[] = [];
  let current = '';
  let currentType: RunType | null = null;

  for (const char of text) {
    let type: RunType;
    if (/\s/.test(char)) type = 'space';
    else if (HEBREW_RANGE.test(char)) type = 'hebrew';
    else type = 'ltr';

    if (currentType !== null && type !== currentType) {
      runs.push({ text: current, type: currentType });
      current = '';
    }
    current += char;
    currentType = type;
  }
  if (current) runs.push({ text: current, type: currentType! });

  return runs
    .map((run) => (run.type === 'hebrew' ? [...run.text].reverse().join('') : run.text))
    .reverse()
    .join('');
}

const FONT_NAME = 'Rubik';

async function loadFont(doc: jsPDF) {
  const res = await fetch('/fonts/Rubik-Regular.ttf');
  const buf = await res.arrayBuffer();
  const base64 = arrayBufferToBase64(buf);
  doc.addFileToVFS('Rubik-Regular.ttf', base64);
  doc.addFont('Rubik-Regular.ttf', FONT_NAME, 'normal');
  doc.addFont('Rubik-Regular.ttf', FONT_NAME, 'bold');
  doc.setFont(FONT_NAME);
}

function str(value: unknown): string {
  return String(value ?? '');
}

export async function generateShoppingListPdf(
  items: LowStockItem[],
  dateFormat: DateFormat,
  t: TFunction,
  currency: string,
  isRtl: boolean,
) {
  const doc = new jsPDF();
  await loadFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const now = new Date();
  const date = formatDate(now, dateFormat);

  // Title
  doc.setFontSize(20);
  const title = fixRtl(str(t('inventory.shoppingList.title')));
  if (isRtl) {
    doc.text(title, pageWidth - margin, 22, { align: 'right' });
  } else {
    doc.text(title, margin, 22);
  }

  doc.setFontSize(11);
  doc.setTextColor(100);
  if (isRtl) {
    doc.text(date, pageWidth - margin, 30, { align: 'right' });
  } else {
    doc.text(date, margin, 30);
  }

  if (items.length === 0) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    const emptyMsg = fixRtl(str(t('inventory.shoppingList.allStocked')));
    if (isRtl) {
      doc.text(emptyMsg, pageWidth - margin, 50, { align: 'right' });
    } else {
      doc.text(emptyMsg, margin, 50);
    }
    doc.save(`shopping-list-${date}.pdf`);
    return;
  }

  const headRow = [
    fixRtl(str(t('inventory.shoppingList.ingredient'))),
    fixRtl(str(t('inventory.shoppingList.currentStock'))),
    fixRtl(str(t('inventory.shoppingList.toOrder'))),
    fixRtl(str(t('inventory.shoppingList.estPrice'))),
  ];

  const bodyRows = items.map((item) => {
    const deficit = round(Math.max(0, item.lowStockThreshold - item.quantity));
    const estimatedPrice = item.costPerUnit ? round(deficit * item.costPerUnit) : null;
    return [
      item.name,
      fixRtl(`${round(item.quantity)} ${str(t(`common.units.${item.unit}`, item.unit))}`),
      fixRtl(`${deficit} ${str(t(`common.units.${item.unit}`, item.unit))}`),
      estimatedPrice != null ? `${currency}${estimatedPrice.toFixed(2)}` : '—',
    ];
  });

  const totalCost = items.reduce((sum, item) => {
    const deficit = round(Math.max(0, item.lowStockThreshold - item.quantity));
    return sum + (item.costPerUnit ? deficit * item.costPerUnit : 0);
  }, 0);

  const footRow = ['', '', fixRtl(str(t('inventory.shoppingList.total'))), `${currency}${round(totalCost).toFixed(2)}`];

  // For RTL: reverse column order so the first column appears on the right
  const head = isRtl ? [[...headRow].reverse()] : [headRow];
  const body = isRtl ? bodyRows.map((row) => [...row].reverse()) : bodyRows;
  const foot = isRtl ? [[...footRow].reverse()] : [footRow];

  const halign = isRtl ? 'right' as const : 'left' as const;

  autoTable(doc, {
    startY: 36,
    styles: { font: FONT_NAME, halign },
    head,
    body,
    foot,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
  });

  doc.save(`shopping-list-${date}.pdf`);
}
