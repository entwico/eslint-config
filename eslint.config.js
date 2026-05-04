import { defineConfig } from './dist/index.js';

export default defineConfig({
  root: import.meta.dirname,
  ignores: ['demo/**'],
});
