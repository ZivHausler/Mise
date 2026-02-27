import autoTable from 'jspdf-autotable';
import { fixRtl, drawBidiText } from './pdfHelpers.js';
import { t } from './i18n.js';
import { formatDate } from './dateFormat.js';
import { buildPdf, FONT_NAME, type PdfContext, type PdfSection, type PdfBuildOptions } from './pdfBuilder.js';
import { PDF_COLORS, PDF_LAYOUT } from './pdfTheme.js';
import { ORDER_STATUSES } from '@mise/shared';
import type { Order } from '../../orders/order.types.js';

function drawMetaRow(ctx: PdfContext, label: string, value: string, y: number) {
  const { doc, pageWidth, margin, isRtl } = ctx;

  if (isRtl) {
    drawBidiText(doc, label, pageWidth - margin, y, { align: 'right', isRtl });
    doc.text(value, margin, y, { align: 'left' });
  } else {
    doc.text(label, margin, y);
    doc.text(value, pageWidth - margin, y, { align: 'right' });
  }
}

class StoreHeaderSection implements PdfSection {
  constructor(private storeName: string) {}

  render(ctx: PdfContext, y: number): number {
    const { doc, pageWidth, margin, isRtl } = ctx;
    doc.setFontSize(PDF_LAYOUT.subtitleFontSize);
    doc.setTextColor(...PDF_COLORS.order.storeNameText);
    if (isRtl) {
      drawBidiText(doc, this.storeName, pageWidth - margin, y, { align: 'right', isRtl });
    } else {
      doc.text(this.storeName, margin, y);
    }
    return y + 12;
  }
}

class OrderTitleSection implements PdfSection {
  constructor(private order: Order & { recipeName?: string }) {}

  render(ctx: PdfContext, y: number): number {
    const { doc, pageWidth, margin, isRtl, lang } = ctx;
    doc.setFontSize(PDF_LAYOUT.titleFontSize);
    doc.setTextColor(...PDF_COLORS.shared.black);
    const title = `${t(lang, 'orders.orderNum', 'Order')} #${this.order.orderNumber}`;
    if (isRtl) {
      drawBidiText(doc, title, pageWidth - margin, y, { align: 'right', isRtl });
    } else {
      doc.text(title, margin, y);
    }
    return y + 10;
  }
}

class OrderMetaSection implements PdfSection {
  constructor(private order: Order & { recipeName?: string }) {}

  render(ctx: PdfContext, y: number): number {
    const { doc, lang, dateFormat } = ctx;
    const order = this.order;
    const statusKey = ORDER_STATUSES[order.status] ?? 'received';

    doc.setFontSize(PDF_LAYOUT.bodyFontSize);
    doc.setTextColor(...PDF_COLORS.shared.muted);

    if (order.customer?.name) {
      drawMetaRow(ctx, t(lang, 'orders.customer', 'Customer'), order.customer.name, y);
      y += 6;
    }
    drawMetaRow(ctx, t(lang, 'orders.statusLabel', 'Status'), t(lang, `orders.status.${statusKey}`, statusKey), y);
    y += 6;
    if (order.createdAt) {
      drawMetaRow(ctx, t(lang, 'orders.createdAt', 'Created'), formatDate(order.createdAt, dateFormat), y);
      y += 6;
    }
    if (order.dueDate) {
      drawMetaRow(ctx, t(lang, 'orders.dueDate', 'Due Date'), formatDate(order.dueDate, dateFormat), y);
      y += 6;
    }
    return y + 4;
  }
}

class OrderItemsTableSection implements PdfSection {
  constructor(private order: Order & { recipeName?: string }) {}

  render(ctx: PdfContext, y: number): number {
    const { doc, lang, isRtl, currency } = ctx;
    const order = this.order;

    if (!order.items?.length) return y;

    const headRow = [
      fixRtl(t(lang, 'orders.recipe', 'Recipe')),
      fixRtl(t(lang, 'orders.qty', 'Qty')),
      fixRtl(t(lang, 'orders.price', 'Price')),
    ];

    const bodyRows = order.items.map((item: any) => [
      fixRtl(item.recipeName ?? item.name ?? '-'),
      String(item.quantity),
      `${currency}${(item.unitPrice ?? item.price ?? 0).toFixed(2)}`,
    ]);

    const totalRow = [
      '',
      fixRtl(t(lang, 'orders.total', 'Total')),
      `${currency}${(order.totalAmount ?? 0).toFixed(2)}`,
    ];

    const head = isRtl ? [[...headRow].reverse()] : [headRow];
    const body = isRtl ? bodyRows.map((row) => [...row].reverse()) : bodyRows;
    const foot = isRtl ? [[...totalRow].reverse()] : [totalRow];
    const halign = isRtl ? ('right' as const) : ('left' as const);

    autoTable(doc, {
      startY: y,
      styles: { font: FONT_NAME, halign },
      head,
      body,
      foot,
      theme: 'striped',
      headStyles: { fillColor: PDF_COLORS.order.tableHeader },
      footStyles: { fillColor: PDF_COLORS.shared.tableFooterBg, textColor: PDF_COLORS.shared.tableFooterText, fontStyle: 'bold' },
    });

    return (doc as any).lastAutoTable.finalY + 10;
  }
}

class OrderNotesSection implements PdfSection {
  constructor(private order: Order & { recipeName?: string }) {}

  render(ctx: PdfContext, y: number): number {
    const { doc, pageWidth, margin, isRtl, lang } = ctx;
    const order = this.order;

    if (!order.notes) return y;

    doc.setFontSize(PDF_LAYOUT.labelFontSize);
    doc.setTextColor(...PDF_COLORS.shared.black);
    if (isRtl) {
      drawBidiText(doc, t(lang, 'orders.notes', 'Notes'), pageWidth - margin, y, { align: 'right', isRtl });
    } else {
      doc.text(t(lang, 'orders.notes', 'Notes'), margin, y);
    }
    y += 7;
    doc.setFontSize(PDF_LAYOUT.smallFontSize);
    doc.setTextColor(...PDF_COLORS.shared.muted);
    if (isRtl) {
      drawBidiText(doc, order.notes, pageWidth - margin, y, { align: 'right', isRtl });
    } else {
      doc.text(order.notes, margin, y, { maxWidth: pageWidth - margin * 2 });
    }
    return y + 10;
  }
}

export function generateOrderPdf(
  order: Order & { recipeName?: string },
  options: PdfBuildOptions & { storeName: string },
): Buffer {
  const sections: PdfSection[] = [
    new StoreHeaderSection(options.storeName),
    new OrderTitleSection(order),
    new OrderMetaSection(order),
    new OrderItemsTableSection(order),
    new OrderNotesSection(order),
  ];

  return buildPdf(sections, options);
}
