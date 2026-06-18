import { describe, expect, it } from 'vitest';

import { astro } from '../src/presets/astro.js';

describe('astro preset', () => {
  it('disables unicorn/prefer-module for .astro files only', () => {
    const config = astro();

    const block = config.find(
      (entry) =>
        Array.isArray(entry.files) &&
        entry.files.length === 1 &&
        entry.files[0] === '**/*.astro' &&
        entry.rules?.['unicorn/prefer-module'] === 'off',
    );

    expect(block, 'expected an .astro-scoped block disabling unicorn/prefer-module').toBeDefined();
  });

  const findParserBlock = (config: ReturnType<typeof astro>) =>
    config.find((entry) => {
      const lo = entry.languageOptions;

      return typeof lo === 'object' && lo !== null && 'parser' in lo && Boolean(lo.parser);
    });

  it('defaults `project: true` on the astro parser block so type-aware rules get type info', () => {
    const parserBlock = findParserBlock(astro());
    const parserOptions = parserBlock?.languageOptions?.parserOptions as { project?: unknown } | undefined;

    // without this, astro-eslint-parser builds no program and rules like no-excess-jsx-props silently no-op
    expect(parserOptions?.project).toBe(true);
  });

  it('forwards tsconfigProject to the astro parser block', () => {
    const parserBlock = findParserBlock(astro({ tsconfigProject: ['./tsconfig.app.json'] }));
    const parserOptions = parserBlock?.languageOptions?.parserOptions as { project?: unknown } | undefined;

    expect(parserOptions?.project).toEqual(['./tsconfig.app.json']);
  });

  it('enables the @astroscope rules sourced from the plugin recommended config', () => {
    const config = astro();
    const block = config.find((entry) => entry.rules?.['@astroscope/island-readonly'] !== undefined);

    expect(block?.rules?.['@astroscope/island-readonly']).toBe('error');
    expect(block?.rules?.['@astroscope/island-not-serializable']).toBe('error');
    expect(block?.rules?.['@astroscope/no-client-directive-on-astro-component']).toBe('error');
    // sourced from recommended, so non-island rules come along too
    expect(block?.rules?.['@astroscope/no-excess-jsx-props']).toBe('error');
    expect(block?.rules?.['@astroscope/prefer-ssr-guard']).toBe('error');
  });
});
