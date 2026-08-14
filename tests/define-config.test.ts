import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { defineConfig } from '../src/define-config.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

function configHasPlugin(config: Awaited<ReturnType<typeof defineConfig>>, name: string): boolean {
  return config.some((c) => c.plugins !== undefined && Object.hasOwn(c.plugins, name));
}

function configHasRule(config: Awaited<ReturnType<typeof defineConfig>>, ruleId: string): boolean {
  return config.some((c) => c.rules !== undefined && Object.hasOwn(c.rules, ruleId));
}

describe('defineConfig', () => {
  it('returns a non-empty flat-config array', async () => {
    const config = await defineConfig({ root: join(FIXTURES, 'plain') });
    expect(config.length).toBeGreaterThan(0);
  });

  it('always merges DEFAULT_IGNORES with consumer ignores', async () => {
    const config = await defineConfig({
      root: join(FIXTURES, 'plain'),
      ignores: ['public/*'],
    });
    const ignoresBlock = config.find((c) => 'ignores' in c && Object.keys(c).length === 1);
    expect(ignoresBlock?.ignores).toContain('**/dist/**');
    expect(ignoresBlock?.ignores).toContain('**/node_modules/**');
    expect(ignoresBlock?.ignores).toContain('public/*');
  });

  it('applies DEFAULT_IGNORES even when ignores is omitted', async () => {
    const config = await defineConfig({ root: join(FIXTURES, 'plain') });
    const ignoresBlock = config.find((c) => 'ignores' in c && Object.keys(c).length === 1);
    expect(ignoresBlock?.ignores).toContain('**/dist/**');
    expect(ignoresBlock?.ignores).toContain('**/.astro/**');
  });

  it('appends extra config blocks at the end', async () => {
    const sentinel = { rules: { 'no-debugger': 'error' as const } };
    const config = await defineConfig({
      root: join(FIXTURES, 'plain'),
      extra: [sentinel],
    });
    expect(config.at(-1)).toBe(sentinel);
  });

  it('does not include react-refresh plugin without vite in deps', async () => {
    const config = await defineConfig({ root: join(FIXTURES, 'plain'), react: true });
    expect(configHasPlugin(config, 'react-refresh')).toBe(false);
  });

  it('auto-includes react-refresh plugin when vite is in deps', async () => {
    const config = await defineConfig({ root: join(FIXTURES, 'with-vite'), react: true });
    expect(configHasPlugin(config, 'react-refresh')).toBe(true);
  });

  it('treats explicit undefined the same as omitted (auto-detection still applies)', async () => {
    const config = await defineConfig({
      root: join(FIXTURES, 'with-vite'),
      react: { reactRefresh: undefined },
    });
    expect(configHasPlugin(config, 'react-refresh')).toBe(true);
  });

  it('lets explicit false override auto-detection', async () => {
    const config = await defineConfig({
      root: join(FIXTURES, 'with-vite'),
      react: { reactRefresh: false },
    });
    expect(configHasPlugin(config, 'react-refresh')).toBe(false);
  });

  it('does not include astroscope/i18n plugin when @astroscope/i18n is absent', async () => {
    const config = await defineConfig({ root: join(FIXTURES, 'plain'), astro: true });
    expect(configHasPlugin(config, '@astroscope/i18n')).toBe(false);
  });

  it('auto-includes astroscope/i18n plugin when @astroscope/i18n is in deps', async () => {
    const config = await defineConfig({ root: join(FIXTURES, 'with-i18n'), astro: true });
    expect(configHasPlugin(config, '@astroscope/i18n')).toBe(true);
  });

  it('always includes astroscope core plugin when astro: true', async () => {
    const config = await defineConfig({ root: join(FIXTURES, 'plain'), astro: true });
    expect(configHasPlugin(config, '@astroscope')).toBe(true);
    expect(configHasRule(config, '@astroscope/no-html-comments')).toBe(true);
    expect(configHasRule(config, '@astroscope/no-excess-jsx-props')).toBe(true);
  });

  it('does not include any astro/astroscope plugin when astro: false', async () => {
    const config = await defineConfig({ root: join(FIXTURES, 'with-i18n'), astro: false });
    expect(configHasPlugin(config, '@astroscope')).toBe(false);
    expect(configHasPlugin(config, '@astroscope/i18n')).toBe(false);
  });

  it('always includes base, imports, stylistic, unicorn plugins', async () => {
    const config = await defineConfig({ root: join(FIXTURES, 'plain') });
    expect(configHasPlugin(config, '@stylistic')).toBe(true);
    expect(configHasPlugin(config, 'import-x')).toBe(true);
    expect(configHasPlugin(config, 'unicorn')).toBe(true);
    expect(configHasRule(config, 'unicorn/no-array-sort')).toBe(true);
    expect(configHasRule(config, 'unicorn/no-array-reverse')).toBe(true);
  });

  it('leaves css off for a project with no tailwind, so the language is never loaded', async () => {
    const config = await defineConfig({ root: join(FIXTURES, 'plain') });

    expect(config.some((c) => c.language === 'css/css')).toBe(false);
  });

  it('enables css alongside tailwind, and hands it the tailwind options', async () => {
    const config = await defineConfig({
      root: join(FIXTURES, 'plain'),
      tailwind: { entryPoint: 'src/styles/index.css' },
    });
    const cssBlock = config.find((c) => c.language === 'css/css');

    expect(cssBlock).toBeDefined();
    expect((cssBlock?.languageOptions as Record<string, unknown>).customSyntax).toBeDefined();
    expect(Object.hasOwn(cssBlock?.rules ?? {}, 'better-tailwindcss/no-unknown-classes')).toBe(true);
  });

  it('takes css on its own, without tailwind', async () => {
    const config = await defineConfig({ root: join(FIXTURES, 'plain'), css: true });
    const cssBlock = config.find((c) => c.language === 'css/css');

    expect(Object.hasOwn(cssBlock?.rules ?? {}, 'css/no-duplicate-imports')).toBe(true);
    expect(Object.hasOwn(cssBlock?.rules ?? {}, 'better-tailwindcss/no-unknown-classes')).toBe(false);
    expect((cssBlock?.languageOptions as Record<string, unknown>).customSyntax).toBeUndefined();
  });

  it('lets a tailwind project opt out of css linting', async () => {
    const config = await defineConfig({
      root: join(FIXTURES, 'plain'),
      tailwind: { entryPoint: 'src/styles/index.css' },
      css: false,
    });

    expect(config.some((c) => c.language === 'css/css')).toBe(false);
    expect(configHasPlugin(config, 'better-tailwindcss')).toBe(true);
  });

  it('does not auto-enable json plugin', async () => {
    const config = await defineConfig({ root: join(FIXTURES, 'plain') });
    expect(configHasPlugin(config, 'json')).toBe(false);
  });

  it('sets tsconfigRootDir to the consumer root', async () => {
    const root = join(FIXTURES, 'plain');
    const config = await defineConfig({ root });

    const block = config.find((c) => {
      const opts = c.languageOptions?.parserOptions as { tsconfigRootDir?: string } | undefined;
      return opts?.tsconfigRootDir !== undefined;
    });

    const parserOptions = block?.languageOptions?.parserOptions as { tsconfigRootDir?: string } | undefined;
    expect(parserOptions?.tsconfigRootDir).toBe(root);
  });

  it('enables reportUnusedDisableDirectives at error severity', async () => {
    const config = await defineConfig({ root: join(FIXTURES, 'plain') });
    const block = config.find(
      (c) => c.linterOptions?.reportUnusedDisableDirectives !== undefined,
    );
    expect(block?.linterOptions?.reportUnusedDisableDirectives).toBe('error');
  });

  it('promotes warn-severity rules inside `extra` by default', async () => {
    const config = await defineConfig({
      root: join(FIXTURES, 'plain'),
      extra: [{ rules: { 'no-debugger': 'warn' } }],
    });
    const last = config.at(-1);
    expect(last?.rules?.['no-debugger']).toBe('error');
  });

  it('leaves `extra` severities verbatim when extraPromoteWarnings is false', async () => {
    const config = await defineConfig({
      root: join(FIXTURES, 'plain'),
      extra: [{ rules: { 'no-debugger': 'warn' } }],
      extraPromoteWarnings: false,
    });
    const last = config.at(-1);
    expect(last?.rules?.['no-debugger']).toBe('warn');
  });

  it('promotes every shipped warn-severity rule to error', async () => {
    const config = await defineConfig({
      root: join(FIXTURES, 'with-vite'),
      react: true,
      astro: { i18n: true },
    });
    for (const block of config) {
      if (block.rules === undefined) continue;
      for (const [id, entry] of Object.entries(block.rules)) {
        const severity = Array.isArray(entry) ? entry[0] : entry;
        expect(severity, `rule ${id} should not ship at warn`).not.toBe('warn');
        expect(severity, `rule ${id} should not ship at numeric 1`).not.toBe(1);
      }
    }
  });

  it('forwards tsconfigProject to the base preset', async () => {
    const root = join(FIXTURES, 'plain');
    const config = await defineConfig({
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
