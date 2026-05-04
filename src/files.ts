/**
 * Default file glob for JS/TS-targeting presets.
 * Excludes JSON, Markdown, CSS, etc. — those are handled by their own presets.
 */
export const JS_TS_FILES = ['**/*.{js,mjs,cjs,ts,tsx,jsx,astro}'];

/**
 * Sensible default global ignores. Consumers compose with their own:
 *   ignores: [...DEFAULT_IGNORES, 'public/*']
 */
export const DEFAULT_IGNORES = [
  '**/dist/**',
  '**/node_modules/**',
  '**/coverage/**',
  '**/.astro/**',
  '**/.next/**',
  '**/.turbo/**',
];
