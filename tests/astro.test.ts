import { describe, expect, it } from 'vitest';

import { astro } from '../src/presets/astro.js';

describe('astro preset', () => {
  it('disables unicorn/prefer-module for .astro files only', () => {
    const config = astro();

    const block = config.find(
      (entry) =>
        Array.isArray(entry.files)
        && entry.files.length === 1
        && entry.files[0] === '**/*.astro'
        && entry.rules?.['unicorn/prefer-module'] === 'off',
    );

    expect(block, 'expected an .astro-scoped block disabling unicorn/prefer-module').toBeDefined();
  });
});
