import { defineConfig, DEFAULT_IGNORES } from './dist/index.js';

export default defineConfig({
  root: import.meta.dirname,
  ignores: [...DEFAULT_IGNORES, 'demo/**'],
});
