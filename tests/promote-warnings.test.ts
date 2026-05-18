import { describe, expect, it } from 'vitest';

import type { FlatConfigArray } from '../src/types.js';
import { promoteWarnings } from '../src/utils/promote-warnings.js';

describe('promoteWarnings', () => {
  it('promotes shorthand "warn" to "error"', () => {
    const out = promoteWarnings([{ rules: { 'no-debugger': 'warn' } }]);
    expect(out[0]?.rules?.['no-debugger']).toBe('error');
  });

  it('promotes numeric 1 to "error"', () => {
    const out = promoteWarnings([{ rules: { 'no-debugger': 1 } }]);
    expect(out[0]?.rules?.['no-debugger']).toBe('error');
  });

  it('promotes ["warn", options] to ["error", options] preserving options', () => {
    const out = promoteWarnings([{ rules: { 'some-rule': ['warn', { foo: 1 }] } }]);
    expect(out[0]?.rules?.['some-rule']).toEqual(['error', { foo: 1 }]);
  });

  it('promotes [1, options] to ["error", options]', () => {
    const out = promoteWarnings([{ rules: { 'some-rule': [1, { foo: 1 }] } }]);
    expect(out[0]?.rules?.['some-rule']).toEqual(['error', { foo: 1 }]);
  });

  it('leaves "error", "off", 0, 2 alone', () => {
    const input: FlatConfigArray = [
      { rules: { a: 'error', b: 'off', c: 0, d: 2 } },
    ];
    const out = promoteWarnings(input);
    expect(out[0]?.rules).toEqual({ a: 'error', b: 'off', c: 0, d: 2 });
  });

  it('leaves ["error", options] and ["off", options] alone', () => {
    const out = promoteWarnings([{ rules: { a: ['error', { x: 1 }], b: ['off'] } }]);
    expect(out[0]?.rules).toEqual({ a: ['error', { x: 1 }], b: ['off'] });
  });

  it('preserves block identity when nothing changed', () => {
    const block = { rules: { 'no-debugger': 'error' as const } };
    const out = promoteWarnings([block]);
    expect(out[0]).toBe(block);
  });

  it('preserves identity of blocks without rules at all', () => {
    const block = { ignores: ['dist/**'] };
    const out = promoteWarnings([block]);
    expect(out[0]).toBe(block);
  });

  it('only rewrites blocks that contained warns; others stay by-reference', () => {
    const untouched = { rules: { 'no-debugger': 'error' as const } };
    const touched = { rules: { foo: 'warn' as const } };
    const [outA, outB] = promoteWarnings([untouched, touched]);
    expect(outA).toBe(untouched);
    expect(outB).not.toBe(touched);
    expect(outB?.rules?.foo).toBe('error');
  });

  it('preserves non-rule keys when rewriting (files, plugins, languageOptions)', () => {
    const block = {
      files: ['**/*.ts'],
      languageOptions: { ecmaVersion: 2022 as const },
      rules: { foo: 'warn' as const },
    };
    const [out] = promoteWarnings([block]);
    expect(out?.files).toBe(block.files);
    expect(out?.languageOptions).toBe(block.languageOptions);
    expect(out?.rules?.foo).toBe('error');
  });
});
