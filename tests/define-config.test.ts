import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { defineConfig } from '../src/define-config.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

function configHasPlugin(config: ReturnType<typeof defineConfig>, name: string): boolean {
  return config.some((c) => c.plugins != null && name in c.plugins);
}

function configHasRule(config: ReturnType<typeof defineConfig>, ruleId: string): boolean {
  return config.some((c) => c.rules != null && ruleId in c.rules);
}

function ruleIsDisabled(config: ReturnType<typeof defineConfig>, ruleId: string): boolean {
  return config.some((c) => c.rules?.[ruleId] === 'off');
}

describe('defineConfig', () => {
  it('returns a non-empty flat-config array', () => {
    const config = defineConfig({ root: join(FIXTURES, 'plain') });
    expect(config.length).toBeGreaterThan(0);
  });

  it('always merges DEFAULT_IGNORES with consumer ignores', () => {
    const config = defineConfig({
      root: join(FIXTURES, 'plain'),
      ignores: ['public/*'],
    });
    const ignoresBlock = config.find((c) => 'ignores' in c && Object.keys(c).length === 1);
    expect(ignoresBlock?.ignores).toContain('**/dist/**');
    expect(ignoresBlock?.ignores).toContain('**/node_modules/**');
    expect(ignoresBlock?.ignores).toContain('public/*');
  });

  it('applies DEFAULT_IGNORES even when ignores is omitted', () => {
    const config = defineConfig({ root: join(FIXTURES, 'plain') });
    const ignoresBlock = config.find((c) => 'ignores' in c && Object.keys(c).length === 1);
    expect(ignoresBlock?.ignores).toContain('**/dist/**');
    expect(ignoresBlock?.ignores).toContain('**/.astro/**');
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

  it('disables compiler-specific react-hooks rules when babel-plugin-react-compiler is absent', () => {
    const config = defineConfig({ root: join(FIXTURES, 'plain'), react: true });
    expect(ruleIsDisabled(config, 'react-hooks/refs')).toBe(true);
    expect(ruleIsDisabled(config, 'react-hooks/incompatible-library')).toBe(true);
    expect(ruleIsDisabled(config, 'react-hooks/unsupported-syntax')).toBe(true);
    expect(ruleIsDisabled(config, 'react-hooks/set-state-in-effect')).toBe(true);
  });

  it('auto-enables compiler-specific react-hooks rules when babel-plugin-react-compiler is in deps', () => {
    const config = defineConfig({ root: join(FIXTURES, 'with-react-compiler'), react: true });
    expect(ruleIsDisabled(config, 'react-hooks/refs')).toBe(false);
    expect(ruleIsDisabled(config, 'react-hooks/incompatible-library')).toBe(false);
    expect(ruleIsDisabled(config, 'react-hooks/unsupported-syntax')).toBe(false);
    expect(ruleIsDisabled(config, 'react-hooks/set-state-in-effect')).toBe(false);
  });

  it('treats explicit undefined the same as omitted (auto-detection still applies)', () => {
    const config = defineConfig({
      root: join(FIXTURES, 'with-react-compiler'),
      react: { reactCompiler: undefined, reactRefresh: undefined },
    });
    expect(ruleIsDisabled(config, 'react-hooks/refs')).toBe(false);
  });

  it('lets explicit false override auto-detection', () => {
    const config = defineConfig({
      root: join(FIXTURES, 'with-react-compiler'),
      react: { reactCompiler: false },
    });
    expect(ruleIsDisabled(config, 'react-hooks/refs')).toBe(true);
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

  it('always includes base, imports, stylistic, unicorn plugins', () => {
    const config = defineConfig({ root: join(FIXTURES, 'plain') });
    expect(configHasPlugin(config, '@stylistic')).toBe(true);
    expect(configHasPlugin(config, 'import-x')).toBe(true);
    expect(configHasPlugin(config, 'unicorn')).toBe(true);
    expect(configHasRule(config, 'unicorn/no-array-sort')).toBe(true);
    expect(configHasRule(config, 'unicorn/no-array-reverse')).toBe(true);
  });

  it('does not auto-enable json plugin', () => {
    const config = defineConfig({ root: join(FIXTURES, 'plain') });
    expect(configHasPlugin(config, 'json')).toBe(false);
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

  it('forwards tsconfigProject to the base preset', () => {
    const root = join(FIXTURES, 'plain');
    const config = defineConfig({
      root,
      tsconfigProject: ['./tsconfig.app.json', './tsconfig.node.json'],
    });

    const typeAwareBlock = config.find((c) => {
      const opts = c.languageOptions?.parserOptions as { project?: unknown } | undefined;
      return Array.isArray(opts?.project);
    });

    const parserOptions = typeAwareBlock?.languageOptions?.parserOptions as
      | { project?: unknown; projectService?: unknown }
      | undefined;
    expect(parserOptions?.project).toEqual(['./tsconfig.app.json', './tsconfig.node.json']);
    expect(parserOptions?.projectService).toBeUndefined();
  });
});
