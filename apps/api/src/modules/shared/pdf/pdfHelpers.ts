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

export function fixRtl(text: string): string {
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
    .map((run) => (run.type === 'space' ? run.text : [...run.text].reverse().join('')))
    .reverse()
    .join('');
}

export const FONT_NAME = 'Rubik';

let cachedFontBase64: string | null = null;

function getFontBase64(): string {
  if (!cachedFontBase64) {
    const fontPath = path.resolve(__dirname, '../../../../assets/fonts/Rubik-Regular.ttf');
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
