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

  it('defaults `projectService: true` on the astro parser block so type-aware rules get type info', () => {
    const parserBlock = findParserBlock(astro());
    const parserOptions = parserBlock?.languageOptions?.parserOptions as
      | { project?: unknown; projectService?: unknown }
      | undefined;

    // without this, the parser builds no program and rules like no-excess-jsx-props silently no-op
    expect(parserOptions?.projectService).toBe(true);
    expect(parserOptions?.project).toBeUndefined();
  });

  it('uses the @entwico/astro-eslint-parser fork on the astro parser block', () => {
    const parserBlock = findParserBlock(astro());
    const parser = parserBlock?.languageOptions?.parser as { meta?: { name?: string } } | undefined;

    // the fork adds `projectService` support; the stock parser would warn and downgrade
    expect(parser?.meta?.name).toBe('@entwico/astro-eslint-parser');
  });

  it('leaves no block that would restore the stock astro parser (flat-config later-wins)', () => {
    const parserNames = astro()
      .map((entry) => {
        const lo = entry.languageOptions;
        const parser =
          typeof lo === 'object' && lo !== null && 'parser' in lo
            ? (lo.parser as { meta?: { name?: string } } | undefined)
            : undefined;

        return parser?.meta?.name;
      })
      .filter((name) => name === 'astro-eslint-parser');

    expect(parserNames).toEqual([]);
  });

  it('forwards tsconfigProject to the astro parser block as `project`', () => {
    const parserBlock = findParserBlock(astro({ tsconfigProject: ['./tsconfig.app.json'] }));
    const parserOptions = parserBlock?.languageOptions?.parserOptions as
      | { project?: unknown; projectService?: unknown }
      | undefined;

    expect(parserOptions?.project).toEqual(['./tsconfig.app.json']);
    expect(parserOptions?.projectService).toBeUndefined();
  });

  it('keeps `project: null` on the virtual-script block so inline <script> TS stays type-service-free', () => {
    const config = astro({ tsconfigProject: ['./tsconfig.app.json'] });
    const virtualBlock = config.find(
      (entry) => Array.isArray(entry.files) && entry.files.includes('**/*.astro/*.ts'),
    );
    const parserOptions = virtualBlock?.languageOptions?.parserOptions as { project?: unknown } | undefined;

    expect(virtualBlock).toBeDefined();
    // overriding this would make type-aware rules throw `requires type information` on inline scripts
    expect(parserOptions?.project).toBeNull();
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
