import tsParser from '@typescript-eslint/parser';
import { describe, expect, it } from 'vitest';

import { entwicoPlugin } from '../src/plugin.js';
import type { FlatConfigArray } from '../src/types.js';
import { lint } from './helpers/lint.js';

function config(options: Record<string, unknown> = {}): FlatConfigArray {
  return [
    {
      files: ['**/*.ts'],
      languageOptions: {
        parser: tsParser as never,
        parserOptions: { sourceType: 'module' },
      },
      plugins: { '@entwico': entwicoPlugin },
      rules: { '@entwico/no-reexport': ['error', options] },
    },
  ];
}

function messages(code: string, options?: Record<string, unknown>): string[] {
  return lint(code, config(options), 'file.ts').map((m) => m.message);
}

describe('@entwico/no-reexport', () => {
  it('reports a named re-export and names the source', () => {
    expect(messages('export { Button } from \'./button\';')).toEqual([
      'no re-exports — import `Button` from `./button` directly',
    ]);
  });

  it('reports every specifier of a multi-specifier re-export', () => {
    expect(messages('export { a, b, c } from \'./x\';')).toHaveLength(3);
  });

  it('reports star and namespace re-exports', () => {
    expect(messages('export * from \'./x\';')).toHaveLength(1);
    expect(messages('export * as x from \'./x\';')).toHaveLength(1);
  });

  it('reports the spelled-out form, naming the source it was imported from', () => {
    expect(messages('import { a } from \'./a\';\nexport { a };')).toEqual([
      'no re-exports — `a` is imported from `./a`, import it from there directly',
    ]);
  });

  it('names the source-side name, not the local one, when the import was renamed', () => {
    expect(messages('import { a as b } from \'./a\';\nexport { b };')).toEqual([
      'no re-exports — `a` is imported from `./a`, import it from there directly',
    ]);
  });

  it('reports a renamed re-export of an import', () => {
    expect(messages('import { a } from \'./a\';\nexport { a as b };')).toHaveLength(1);
  });

  it('names default and namespace imports by their local name', () => {
    expect(messages('import d from \'./d\';\nexport { d };')).toEqual([
      'no re-exports — `d` is imported from `./d`, import it from there directly',
    ]);
    expect(messages('import * as ns from \'./ns\';\nexport { ns };')).toEqual([
      'no re-exports — `ns` is imported from `./ns`, import it from there directly',
    ]);
  });

  it('leaves locally declared exports alone', () => {
    expect(messages('export const a = 1;\nexport function b() {}\nexport default b;')).toEqual([]);
    expect(messages('import { a } from \'./a\';\nconst b = a + 1;\nexport { b };')).toEqual([]);
  });

  it('reports type re-exports by default and honours allowTypes', () => {
    expect(messages('export type { Props } from \'./props\';')).toHaveLength(1);
    expect(messages('export { type Props } from \'./props\';')).toHaveLength(1);
    expect(messages('export type * from \'./props\';')).toHaveLength(1);

    expect(messages('export type { Props } from \'./props\';', { allowTypes: true })).toEqual([]);
    expect(messages('export { type Props } from \'./props\';', { allowTypes: true })).toEqual([]);
    expect(messages('import type { P } from \'./p\';\nexport type { P };', { allowTypes: true })).toEqual([]);
  });

  it('still reports value re-exports when allowTypes is on', () => {
    expect(messages('export { Button, type Props } from \'./button\';', { allowTypes: true })).toHaveLength(1);
  });
});
