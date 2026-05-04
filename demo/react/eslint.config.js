import { defineConfig } from '@entwico/eslint-config';

export default defineConfig({
  root: import.meta.dirname,
  react: true,
  tailwind: { entryPoint: 'src/styles/index.css' },
});
