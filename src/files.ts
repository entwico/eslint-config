/** File glob applied to JS/TS-targeting presets. */
export const JS_TS_FILES = ['**/*.{js,mjs,cjs,ts,tsx,jsx,astro}'];

/** Default global ignores. */
export const DEFAULT_IGNORES = [
  '**/dist/**',
  '**/node_modules/**',
  '**/coverage/**',
  '**/.astro/**',
  '**/.next/**',
  '**/.turbo/**',
];
