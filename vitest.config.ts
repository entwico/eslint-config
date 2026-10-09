import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // workers share no module cache
    fileParallelism: false,
  },
});
