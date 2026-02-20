import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { InternalError } from '../../../core/errors/app-error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadLocale(filename: string): Record<string, unknown> {
  try {
    const filePath = path.resolve(__dirname, '../../../../assets/locales', filename);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    throw new InternalError(`Failed to load PDF locale file: ${filename}`);
  }
}

const locales: Record<string, Record<string, unknown>> = {
  en: loadLocale('en.json'),
  he: loadLocale('he.json'),
};

export function t(lang: string, key: string, fallback?: string): string {
  const locale = locales[lang] ?? locales['en']!;
  const parts = key.split('.');
  let current: unknown = locale;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return fallback ?? key;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : (fallback ?? key);
}
