import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jsPDF } from 'jspdf';
import { InternalError } from '../../../core/errors/app-error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

export const HEBREW_RANGE = /[\u0590-\u05FF]/;

/**
 * Split text into bidi segments: hebrew, ltr, and space.
 * Neutral chars (punctuation, symbols) are resolved to their neighboring direction.
 */
export function splitBidiSegments(text: string): { text: string; type: 'hebrew' | 'ltr' | 'space' }[] {
  const chars = [...text];

  type CharDir = 'hebrew' | 'ltr' | 'space' | 'neutral';
  const dirs: CharDir[] = chars.map((ch) => {
    if (/\s/.test(ch)) return 'space';
    if (HEBREW_RANGE.test(ch)) return 'hebrew';
    if (/[a-zA-Z0-9]/.test(ch)) return 'ltr';
    return 'neutral';
  });

  // Resolve neutrals by nearest strong neighbor within same space-delimited segment
  for (let i = 0; i < dirs.length; i++) {
    if (dirs[i] !== 'neutral') continue;
    let left: 'hebrew' | 'ltr' | null = null;
    for (let j = i - 1; j >= 0; j--) {
      if (dirs[j] === 'space') break;
      if (dirs[j] === 'hebrew' || dirs[j] === 'ltr') { left = dirs[j] as 'hebrew' | 'ltr'; break; }
    }
    let right: 'hebrew' | 'ltr' | null = null;
    for (let j = i + 1; j < dirs.length; j++) {
      if (dirs[j] === 'space') break;
      if (dirs[j] === 'hebrew' || dirs[j] === 'ltr') { right = dirs[j] as 'hebrew' | 'ltr'; break; }
    }
    dirs[i] = left && right ? (left === right ? left : left) : (left ?? right ?? 'hebrew');
  }

  type RunType = 'hebrew' | 'ltr' | 'space';
  const runs: { text: string; type: RunType }[] = [];
  let cur = '';
  let curType: RunType | null = null;
  for (let i = 0; i < chars.length; i++) {
    const t = dirs[i] as RunType;
    if (curType !== null && t !== curType) { runs.push({ text: cur, type: curType }); cur = ''; }
    cur += chars[i];
    curType = t;
  }
  if (cur && curType) runs.push({ text: cur, type: curType });
  return runs;
}

/**
 * fixRtl for pure-Hebrew strings only (labels, single-direction text).
 * For mixed Hebrew+LTR content, use drawBidiText instead.
 */
export function fixRtl(text: string): string {
  if (!HEBREW_RANGE.test(text)) return text;
  return [...text].reverse().join('');
}

/**
 * Draw text with proper bidi: Hebrew segments reversed for jsPDF,
 * LTR segments (numbers, English) in natural L→R order.
 * Each segment is drawn as a separate doc.text() call at computed positions.
 */
export function drawBidiText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options: { align?: 'left' | 'center' | 'right'; isRtl?: boolean } = {},
) {
  const align = options.align ?? 'left';
  const isRtl = options.isRtl ?? false;

  if (!isRtl || !HEBREW_RANGE.test(text)) {
    doc.text(text, x, y, { align });
    return;
  }

  const segments = splitBidiSegments(text);

  // For RTL: reverse segment order so first logical segment (Hebrew) ends up on the right
  const visual = [...segments].reverse();

  // Compute display text and widths
  const items = visual.map((seg) => {
    const display = seg.type === 'hebrew' ? [...seg.text].reverse().join('') : seg.text;
    return { display, width: doc.getTextWidth(display) };
  });
  const totalWidth = items.reduce((w, it) => w + it.width, 0);

  // Determine starting X
  let curX: number;
  if (align === 'right') curX = x - totalWidth;
  else if (align === 'center') curX = x - totalWidth / 2;
  else curX = x;

  // Draw each segment individually
  for (const item of items) {
    doc.text(item.display, curX, y);
    curX += item.width;
  }
}

export const FONT_NAME = 'Rubik';

let cachedFontBase64: string | null = null;

function getAssetsDir(): string {
  const fromDist = path.resolve(__dirname, '../assets');
  const fromSrc = path.resolve(__dirname, '../../../../assets');
  if (fs.existsSync(fromDist)) return fromDist;
  return fromSrc;
}

function getFontBase64(): string {
  if (!cachedFontBase64) {
    const fontPath = path.resolve(getAssetsDir(), 'fonts/Rubik-Regular.ttf');
    try {
      const buf = fs.readFileSync(fontPath);
      cachedFontBase64 = arrayBufferToBase64(buf.buffer as ArrayBuffer);
    } catch {
      throw new InternalError(`PDF font file not found: ${fontPath}`);
    }
  }
  return cachedFontBase64;
}

export function loadFont(doc: jsPDF) {
  const base64 = getFontBase64();
  doc.addFileToVFS('Rubik-Regular.ttf', base64);
  doc.addFont('Rubik-Regular.ttf', FONT_NAME, 'normal');
  doc.addFont('Rubik-Regular.ttf', FONT_NAME, 'bold');
  doc.setFont(FONT_NAME);
}
