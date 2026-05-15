import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { base } from '../src/presets/base.js';
import { lint, ruleIds } from './helpers/lint.js';

const ROOT = join(import.meta.dirname, 'fixtures', 'plain');

describe('base preset: unicorn rules', () => {
  it('flags Array#sort() in favor of toSorted()', () => {
    const code = 'export const x = [3, 1, 2].sort();';
    const messages = lint(code, base({ root: ROOT }), 'a.js');
    expect(ruleIds(messages)).toContain('unicorn/no-array-sort');
  });

  it('flags Array#reverse() in favor of toReversed()', () => {
    const code = 'export const x = [1, 2, 3].reverse();';
    const messages = lint(code, base({ root: ROOT }), 'a.js');
    expect(ruleIds(messages)).toContain('unicorn/no-array-reverse');
  });

  it('flags arr.map(parseInt) — the canonical no-array-callback-reference bug', () => {
    const code = 'export const x = ["1", "2"].map(parseInt);';
    const messages = lint(code, base({ root: ROOT }), 'a.js');
    expect(ruleIds(messages)).toContain('unicorn/no-array-callback-reference');
  });

  it('flags instanceof Array (cross-realm bug)', () => {
    const code = 'export const f = (x) => x instanceof Array;';
    const messages = lint(code, base({ root: ROOT }), 'a.js');
    expect(ruleIds(messages)).toContain('unicorn/no-instanceof-builtins');
  });

  it('flags non-protocol node imports', () => {
    const code = 'import { readFile } from "fs";\nexport { readFile };';
    const messages = lint(code, base({ root: ROOT }), 'a.js');
    expect(ruleIds(messages)).toContain('unicorn/prefer-node-protocol');
  });

  it('flags removeEventListener with bound function (no-op)', () => {
    const code = [
      'export const detach = (el, handler) => {',
      '  el.removeEventListener("click", handler.bind(null));',
      '};',
    ].join('\n');
    const messages = lint(code, base({ root: ROOT }), 'a.js');
    expect(ruleIds(messages)).toContain('unicorn/no-invalid-remove-event-listener');
  });

  it('does NOT flag `props` / `e` / `ref` (prevent-abbreviations is off)', () => {
    const code = [
      'export function f(props) {',
      '  const e = props.e;',
      '  return e;',
      '}',
    ].join('\n');
    const messages = lint(code, base({ root: ROOT }), 'a.js');
    expect(ruleIds(messages)).not.toContain('unicorn/prevent-abbreviations');
  });

  it('does NOT flag PascalCase component filenames (filename-case is off)', () => {
    const code = 'export const Button = () => null;';
    const messages = lint(code, base({ root: ROOT }), 'Button.jsx');
    expect(ruleIds(messages)).not.toContain('unicorn/filename-case');
  });

  it('does NOT flag null literals (no-null is off — React refs use null)', () => {
    const code = 'export const ref = { current: null };';
    const messages = lint(code, base({ root: ROOT }), 'a.js');
    expect(ruleIds(messages)).not.toContain('unicorn/no-null');
  });

  it('does NOT flag Array#reduce or forEach (intentionally allowed)', () => {
    const code = [
      'export const sum = [1, 2, 3].reduce((a, b) => a + b, 0);',
      'export const log = () => [1, 2, 3].forEach((x) => console.log(x));',
    ].join('\n');
    const messages = lint(code, base({ root: ROOT }), 'a.js');
    expect(ruleIds(messages)).not.toContain('unicorn/no-array-reduce');
    expect(ruleIds(messages)).not.toContain('unicorn/no-array-for-each');
  });

  it('does not run unicorn rules on .json files (scoped to JS_TS_FILES)', () => {
    const messages = lint('{"a": 1}', base({ root: ROOT }), 'config.json');
    expect(ruleIds(messages).filter((r) => r.startsWith('unicorn/'))).toHaveLength(0);
  });
});
