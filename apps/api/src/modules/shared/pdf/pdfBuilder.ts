import { jsPDF } from 'jspdf';
import { loadFont, FONT_NAME } from './pdfHelpers.js';
import { PDF_LAYOUT } from './pdfTheme.js';
import type { DateFormat } from './dateFormat.js';
import { InternalError } from '../../../core/errors/app-error.js';

export interface PdfContext {
  lang: string;
  isRtl: boolean;
  pageWidth: number;
  margin: number;
  currency: string;
  dateFormat: DateFormat;
  doc: jsPDF;
}

export interface PdfSection {
  render(ctx: PdfContext, y: number): number;
}

export interface PdfBuildOptions {
  lang: string;
  dateFormat: DateFormat;
  currency: string;
}

export function buildPdf(sections: PdfSection[], options: PdfBuildOptions): Buffer {
  try {
    const doc = new jsPDF();
    loadFont(doc);

    const ctx: PdfContext = {
      lang: options.lang,
      isRtl: options.lang === 'he',
      pageWidth: doc.internal.pageSize.getWidth(),
      margin: PDF_LAYOUT.margin,
      currency: options.currency,
      dateFormat: options.dateFormat,
      doc,
    };

    let y = 20;
    for (const section of sections) {
      y = section.render(ctx, y);
    }

    return Buffer.from(doc.output('arraybuffer'));
  } catch (err) {
    if (err instanceof InternalError) throw err;
    throw new InternalError('Failed to generate PDF');
  }
}

export { FONT_NAME };
