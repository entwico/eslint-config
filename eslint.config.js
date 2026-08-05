import { defineConfig } from './dist/index.js';

export default defineConfig({
  root: import.meta.dirname,
  ignores: ['demo/**'],
  // the package entry point is the one legitimate barrel
  imports: { noReexport: { allow: ['src/index.ts'] } },
});
