import autoTable from 'jspdf-autotable';
import { fixRtl, drawBidiText } from './pdfHelpers.js';
import { t } from './i18n.js';
import { formatDate } from './dateFormat.js';
import { buildPdf, FONT_NAME, type PdfContext, type PdfSection, type PdfBuildOptions } from './pdfBuilder.js';
import { PDF_COLORS, PDF_LAYOUT } from './pdfTheme.js';
import type { Invoice } from '../../invoices/invoice.types.js';

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

class InvoiceStoreHeaderSection implements PdfSection {
  constructor(private invoice: Invoice) {}

  render(ctx: PdfContext, y: number): number {
    const { doc, pageWidth, margin, isRtl, lang } = ctx;
    const inv = this.invoice;

    // Store name
    doc.setFontSize(PDF_LAYOUT.subtitleFontSize);
    doc.setTextColor(...PDF_COLORS.order.storeNameText);
    if (isRtl) {
      drawBidiText(doc, inv.store.name || '', pageWidth - margin, y, { align: 'right', isRtl });
    } else {
      doc.text(inv.store.name || '', margin, y);
    }
    y += 7;

    // Store details (address, phone, tax number)
    doc.setFontSize(PDF_LAYOUT.smallFontSize);
    doc.setTextColor(...PDF_COLORS.shared.muted);

    if (inv.store.address) {
      if (isRtl) {
        drawBidiText(doc, inv.store.address, pageWidth - margin, y, { align: 'right', isRtl });
      } else {
        doc.text(inv.store.address, margin, y);
      }
      y += 5;
    }

    if (inv.store.phone) {
      const phoneLine = `${t(lang, 'invoice.phone', 'Tel')}: ${inv.store.phone}`;
      if (isRtl) {
        drawBidiText(doc, phoneLine, pageWidth - margin, y, { align: 'right', isRtl });
      } else {
        doc.text(phoneLine, margin, y);
      }
      y += 5;
    }

    if (inv.store.taxNumber) {
      const taxLine = `${t(lang, 'invoice.authorizedDealer', 'Authorized Dealer')}: ${inv.store.taxNumber}`;
      if (isRtl) {
        drawBidiText(doc, taxLine, pageWidth - margin, y, { align: 'right', isRtl });
      } else {
        doc.text(taxLine, margin, y);
      }
      y += 5;
    }

    return y + 5;
  }
}

class InvoiceTitleSection implements PdfSection {
  constructor(private invoice: Invoice) {}

  render(ctx: PdfContext, y: number): number {
    const { doc, pageWidth, margin, isRtl, lang } = ctx;
    const inv = this.invoice;

    doc.setFontSize(PDF_LAYOUT.titleFontSize);
    doc.setTextColor(...PDF_COLORS.shared.black);

    let title: string;
    if (inv.type === 'credit_note') {
      title = `${t(lang, 'invoice.creditNoteTitle', 'Credit Note')} ${inv.displayNumber}`;
    } else {
      title = `${t(lang, 'invoice.invoiceTitle', 'Tax Invoice-Receipt')} ${inv.displayNumber}`;
    }

    if (isRtl) {
      drawBidiText(doc, title, pageWidth - margin, y, { align: 'right', isRtl });
    } else {
      doc.text(title, margin, y);
    }

    return y + 10;
  }
}

class InvoiceMetaSection implements PdfSection {
  constructor(private invoice: Invoice) {}

  render(ctx: PdfContext, y: number): number {
    const { doc, lang, dateFormat, margin } = ctx;
    const inv = this.invoice;

    doc.setFontSize(PDF_LAYOUT.bodyFontSize);
    doc.setTextColor(...PDF_COLORS.shared.muted);

    drawMetaRow(ctx, t(lang, 'invoice.date', 'Date'), formatDate(inv.issuedAt, dateFormat), y);
    y += 6;

    if (inv.customer.name) {
      drawMetaRow(ctx, t(lang, 'invoice.customer', 'Customer'), inv.customer.name, y);
      y += 6;
    }
    if (inv.customer.phone) {
      drawMetaRow(ctx, t(lang, 'invoice.customerPhone', 'Phone'), inv.customer.phone, y);
      y += 6;
    }
    if (inv.customer.address) {
      const addrLines = inv.customer.address.split('\n');
      drawMetaRow(ctx, t(lang, 'invoice.customerAddress', 'Address'), addrLines[0]!, y);
      y += 6;
      for (let i = 1; i < addrLines.length; i++) {
        doc.text(addrLines[i]!, margin, y, { align: 'left' });
        y += 6;
      }
    }

    drawMetaRow(ctx, t(lang, 'invoice.orderRef', 'Order'), `#${inv.orderNumber ?? inv.orderId}`, y);
    y += 6;

    if (inv.type === 'credit_note' && inv.originalInvoiceId) {
      drawMetaRow(ctx, t(lang, 'invoice.originalInvoice', 'Original Invoice'), `#${inv.originalInvoiceId}`, y);
      y += 6;
    }

    return y + 4;
  }
}

class InvoiceItemsTableSection implements PdfSection {
  constructor(private invoice: Invoice) {}

  render(ctx: PdfContext, y: number): number {
    const { doc, lang, isRtl, currency } = ctx;
    const inv = this.invoice;

    if (!inv.items?.length) return y;

    const headRow = [
      fixRtl(t(lang, 'invoice.description', 'Description')),
      fixRtl(t(lang, 'invoice.qty', 'Qty')),
      fixRtl(t(lang, 'invoice.unitPrice', 'Unit Price')),
      fixRtl(t(lang, 'invoice.lineTotal', 'Total')),
    ];

    const bodyRows = inv.items.map((item) => [
      fixRtl(item.recipeName || '-'),
      String(item.quantity),
      `${currency}${Math.abs(item.unitPrice).toFixed(2)}`,
      `${currency}${Math.abs(item.lineTotal).toFixed(2)}`,
    ]);

    const head = isRtl ? [[...headRow].reverse()] : [headRow];
    const body = isRtl ? bodyRows.map((row) => [...row].reverse()) : bodyRows;
    const halign = isRtl ? ('right' as const) : ('left' as const);

    autoTable(doc, {
      startY: y,
      styles: { font: FONT_NAME, halign },
      head,
      body,
      theme: 'striped',
      headStyles: { fillColor: PDF_COLORS.invoice.tableHeader },
    });

    return (doc as any).lastAutoTable.finalY + 5;
  }
}

class InvoiceTotalsSection implements PdfSection {
  constructor(private invoice: Invoice) {}

  render(ctx: PdfContext, y: number): number {
    const { doc, lang, currency } = ctx;
    const inv = this.invoice;

    doc.setFontSize(PDF_LAYOUT.bodyFontSize);
    doc.setTextColor(...PDF_COLORS.shared.black);

    const subtotalLabel = t(lang, 'invoice.subtotal', 'Subtotal (before VAT)');
    const vatLabel = `${t(lang, 'invoice.vat', 'VAT')} (${inv.pricing.vatRate}%)`;
    const totalLabel = t(lang, 'invoice.total', 'Total');

    const rows = [
      { label: subtotalLabel, value: `${currency}${Math.abs(inv.pricing.subtotal).toFixed(2)}` },
      { label: vatLabel, value: `${currency}${Math.abs(inv.pricing.vatAmount).toFixed(2)}` },
      { label: totalLabel, value: `${currency}${Math.abs(inv.pricing.totalAmount).toFixed(2)}` },
    ];

    for (const row of rows) {
      drawMetaRow(ctx, row.label, row.value, y);
      y += 7;
    }

    return y + 5;
  }
}

class InvoiceNotesSection implements PdfSection {
  constructor(private invoice: Invoice) {}

  render(ctx: PdfContext, y: number): number {
    const { doc, pageWidth, margin, isRtl, lang } = ctx;
    const inv = this.invoice;

    if (!inv.notes) return y;

    doc.setFontSize(PDF_LAYOUT.labelFontSize);
    doc.setTextColor(...PDF_COLORS.shared.black);
    if (isRtl) {
      drawBidiText(doc, t(lang, 'invoice.notes', 'Notes'), pageWidth - margin, y, { align: 'right', isRtl });
    } else {
      doc.text(t(lang, 'invoice.notes', 'Notes'), margin, y);
    }
    y += 7;
    doc.setFontSize(PDF_LAYOUT.smallFontSize);
    doc.setTextColor(...PDF_COLORS.shared.muted);
    if (isRtl) {
      drawBidiText(doc, inv.notes, pageWidth - margin, y, { align: 'right', isRtl });
    } else {
      doc.text(inv.notes, margin, y, { maxWidth: pageWidth - margin * 2 });
    }
    return y + 10;
  }
}

class InvoiceFooterSection implements PdfSection {
  render(ctx: PdfContext, y: number): number {
    const { doc, pageWidth, lang } = ctx;

    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.shared.mutedLight);
    const { isRtl } = ctx;
    drawBidiText(doc, t(lang, 'invoice.footer', 'Generated with Mise'), pageWidth / 2, y + 10, { align: 'center', isRtl });

    return y + 20;
  }
}

export function generateInvoicePdf(
  invoice: Invoice,
  options: PdfBuildOptions,
): Buffer {
  const sections: PdfSection[] = [
    new InvoiceStoreHeaderSection(invoice),
    new InvoiceTitleSection(invoice),
    new InvoiceMetaSection(invoice),
    new InvoiceItemsTableSection(invoice),
    new InvoiceTotalsSection(invoice),
    new InvoiceNotesSection(invoice),
    new InvoiceFooterSection(),
  ];

  return buildPdf(sections, options);
}
