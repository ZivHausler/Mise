import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/modules/**/use-cases/**', 'src/core/**'],
      exclude: ['src/core/database/**', 'src/core/cache/**', 'src/core/di/**', 'src/core/logger/**'],
    },
  },
  resolve: {
    alias: {
      '@mise/shared/src/constants/index.js': '../../packages/shared/src/constants/index.ts',
      '@mise/shared/src/validation/index.js': '../../packages/shared/src/validation/index.ts',
    },
  },
});
