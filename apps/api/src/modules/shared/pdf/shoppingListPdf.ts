import autoTable from 'jspdf-autotable';
import { fixRtl } from './pdfHelpers.js';
import { t } from './i18n.js';
import { formatDate } from './dateFormat.js';
import { buildPdf, FONT_NAME, type PdfContext, type PdfSection, type PdfBuildOptions } from './pdfBuilder.js';
import { PDF_COLORS, PDF_LAYOUT } from './pdfTheme.js';
import type { Ingredient } from '../../inventory/inventory.types.js';

function round(n: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

function str(value: unknown): string {
  return String(value ?? '');
}

class ShoppingListTitleSection implements PdfSection {
  render(ctx: PdfContext, y: number): number {
    const { doc, pageWidth, margin, isRtl, lang, dateFormat } = ctx;
    const date = formatDate(new Date(), dateFormat);

    doc.setFontSize(PDF_LAYOUT.titleFontSize);
    const title = fixRtl(str(t(lang, 'inventory.shoppingList.title')));
    if (isRtl) {
      doc.text(title, pageWidth - margin, y + 2, { align: 'right' });
    } else {
      doc.text(title, margin, y + 2);
    }

    doc.setFontSize(PDF_LAYOUT.bodyFontSize);
    doc.setTextColor(...PDF_COLORS.shared.mutedLight);
    if (isRtl) {
      doc.text(date, pageWidth - margin, y + 10, { align: 'right' });
    } else {
      doc.text(date, margin, y + 10);
    }

    return y + 16;
  }
}

class ShoppingListEmptySection implements PdfSection {
  render(ctx: PdfContext, y: number): number {
    const { doc, pageWidth, margin, isRtl, lang } = ctx;

    doc.setFontSize(14);
    doc.setTextColor(...PDF_COLORS.shared.black);
    const emptyMsg = fixRtl(str(t(lang, 'inventory.shoppingList.allStocked')));
    if (isRtl) {
      doc.text(emptyMsg, pageWidth - margin, y + 14, { align: 'right' });
    } else {
      doc.text(emptyMsg, margin, y + 14);
    }
    return y + 24;
  }
}

class ShoppingListTableSection implements PdfSection {
  constructor(private items: Ingredient[]) {}

  render(ctx: PdfContext, y: number): number {
    const { doc, lang, isRtl, currency } = ctx;
    const items = this.items;

    const headRow = [
      fixRtl(str(t(lang, 'inventory.shoppingList.ingredient'))),
      fixRtl(str(t(lang, 'inventory.shoppingList.currentStock'))),
      fixRtl(str(t(lang, 'inventory.shoppingList.toOrder'))),
      fixRtl(str(t(lang, 'inventory.shoppingList.estPrice'))),
    ];

    const bodyRows = items.map((item) => {
      const deficit = round(Math.max(0, item.lowStockThreshold - item.quantity));
      const estimatedPrice = item.costPerUnit ? round(deficit * item.costPerUnit) : null;
      return [
        isRtl ? item.name.split(' ').reverse().join(' ') : item.name,
        fixRtl(`${round(item.quantity)} ${str(t(lang, `common.units.${item.unit}`, item.unit))}`),
        fixRtl(`${deficit} ${str(t(lang, `common.units.${item.unit}`, item.unit))}`),
        estimatedPrice != null ? `${currency}${estimatedPrice.toFixed(2)}` : '\u2014',
      ];
    });

    const totalCost = items.reduce((sum, item) => {
      const deficit = round(Math.max(0, item.lowStockThreshold - item.quantity));
      return sum + (item.costPerUnit ? deficit * item.costPerUnit : 0);
    }, 0);

    const footRow = ['', '', fixRtl(str(t(lang, 'inventory.shoppingList.total'))), `${currency}${round(totalCost).toFixed(2)}`];

    const head = isRtl ? [[...headRow].reverse()] : [headRow];
    const body = isRtl ? bodyRows.map((row) => [...row].reverse()) : bodyRows;
    const foot = isRtl ? [[...footRow].reverse()] : [footRow];
    const halign = isRtl ? ('right' as const) : ('left' as const);

    autoTable(doc, {
      startY: y,
      styles: { font: FONT_NAME, halign },
      head,
      body,
      foot,
      theme: 'striped',
      headStyles: { fillColor: PDF_COLORS.inventory.tableHeader },
      footStyles: { fillColor: PDF_COLORS.shared.tableFooterBg, textColor: PDF_COLORS.shared.tableFooterText, fontStyle: 'bold' },
    });

    return (doc as any).lastAutoTable.finalY + 10;
  }
}

export function generateShoppingListPdf(
  items: Ingredient[],
  options: PdfBuildOptions,
): Buffer {
  const sections: PdfSection[] = [new ShoppingListTitleSection()];

  if (items.length === 0) {
    sections.push(new ShoppingListEmptySection());
  } else {
    sections.push(new ShoppingListTableSection(items));
  }

  return buildPdf(sections, options);
}
