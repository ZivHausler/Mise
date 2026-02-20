import { test as base } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const test = base.extend({
  storageState: resolve(__dirname, '../tests/.auth/user.json'),
});

export { expect } from '@playwright/test';
