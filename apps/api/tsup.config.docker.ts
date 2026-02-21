import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  noExternal: ['@mise/shared', '@mise/db'],
});
