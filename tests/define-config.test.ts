import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { defineConfig } from '../src/define-config.js';
import { DEFAULT_IGNORES } from '../src/files.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

function configHasPlugin(config: ReturnType<typeof defineConfig>, name: string): boolean {
  return config.some((c) => c.plugins != null && name in c.plugins);
}

function configHasRule(config: ReturnType<typeof defineConfig>, ruleId: string): boolean {
  return config.some((c) => c.rules != null && ruleId in c.rules);
}

describe('defineConfig', () => {
  it('returns a non-empty flat-config array', () => {
    const config = defineConfig({ root: join(FIXTURES, 'plain') });
    expect(config.length).toBeGreaterThan(0);
  });

  it('puts global ignores in their own config block', () => {
    const config = defineConfig({
      root: join(FIXTURES, 'plain'),
      ignores: ['public/*'],
    });
    const ignoresBlock = config.find((c) => 'ignores' in c && Object.keys(c).length === 1);
    expect(ignoresBlock).toBeDefined();
    expect(ignoresBlock?.ignores).toEqual(['public/*']);
  });

  it('exposes DEFAULT_IGNORES with sensible entries', () => {
    expect(DEFAULT_IGNORES).toContain('**/dist/**');
    expect(DEFAULT_IGNORES).toContain('**/node_modules/**');
    expect(DEFAULT_IGNORES).toContain('**/.astro/**');
  });

  it('appends extra config blocks at the end', () => {
    const sentinel = { rules: { 'no-debugger': 'error' as const } };
    const config = defineConfig({
      root: join(FIXTURES, 'plain'),
      extra: [sentinel],
    });
    expect(config[config.length - 1]).toBe(sentinel);
  });

  it('does not include react-refresh plugin without vite in deps', () => {
    const config = defineConfig({ root: join(FIXTURES, 'plain'), react: true });
    expect(configHasPlugin(config, 'react-refresh')).toBe(false);
  });

  it('auto-includes react-refresh plugin when vite is in deps', () => {
    const config = defineConfig({ root: join(FIXTURES, 'with-vite'), react: true });
    expect(configHasPlugin(config, 'react-refresh')).toBe(true);
  });

  it('does not include astroscope/i18n plugin when @astroscope/i18n is absent', () => {
    const config = defineConfig({ root: join(FIXTURES, 'plain'), astro: true });
    expect(configHasPlugin(config, '@astroscope/i18n')).toBe(false);
  });

  it('auto-includes astroscope/i18n plugin when @astroscope/i18n is in deps', () => {
    const config = defineConfig({ root: join(FIXTURES, 'with-i18n'), astro: true });
    expect(configHasPlugin(config, '@astroscope/i18n')).toBe(true);
  });

  it('always includes astroscope core plugin when astro: true', () => {
    const config = defineConfig({ root: join(FIXTURES, 'plain'), astro: true });
    expect(configHasPlugin(config, '@astroscope')).toBe(true);
    expect(configHasRule(config, '@astroscope/no-html-comments')).toBe(true);
    expect(configHasRule(config, '@astroscope/no-excess-jsx-props')).toBe(true);
  });

  it('does not include any astro/astroscope plugin when astro: false', () => {
    const config = defineConfig({ root: join(FIXTURES, 'with-i18n'), astro: false });
    expect(configHasPlugin(config, '@astroscope')).toBe(false);
    expect(configHasPlugin(config, '@astroscope/i18n')).toBe(false);
  });

  it('always includes base, imports, stylistic, json plugins', () => {
    const config = defineConfig({ root: join(FIXTURES, 'plain') });
    expect(configHasPlugin(config, '@stylistic')).toBe(true);
    expect(configHasPlugin(config, 'import-x')).toBe(true);
    expect(configHasPlugin(config, 'json')).toBe(true);
  });

  it('sets tsconfigRootDir to the consumer root', () => {
    const root = join(FIXTURES, 'plain');
    const config = defineConfig({ root });

    const block = config.find(
      (c) => (c.languageOptions?.parserOptions as { tsconfigRootDir?: string } | undefined)?.tsconfigRootDir != null,
    );

    const parserOptions = block?.languageOptions?.parserOptions as { tsconfigRootDir?: string } | undefined;
    expect(parserOptions?.tsconfigRootDir).toBe(root);
  });
});
