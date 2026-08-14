import { describe, expect, it } from 'vitest';

import { entwicoPlugin } from '../src/plugin.js';
import type { FlatConfigArray } from '../src/types.js';
import { lint, ruleIds } from './helpers/lint.js';

const config: FlatConfigArray = [
  {
    files: ['**/*.ts'],
    plugins: { '@entwico': entwicoPlugin },
    rules: { '@entwico/no-unsafe-regex': 'error' },
  },
];

const messagesFor = (code: string) => lint(code, config, 'a.ts');
const rulesFor = (code: string) => ruleIds(messagesFor(code));

describe('@entwico/no-unsafe-regex', () => {
  describe('exponential backtracking', () => {
    it.each([
      ['nested + inside +', '/(a+)+$/'],
      ['nested * inside *', '/(a*)*$/'],
      ['nested + inside *', '/(a+)*$/'],
      ['a character class body', '/^([a-z]+)+$/'],
      ['a character set body', String.raw`/(\d+)+$/`],
      ['a non-capturing group', String.raw`/(?:\w+)+$/`],
      ['an extra layer of grouping', '/((a+))+$/'],
      ['one vulnerable alternative', '/(a+|b)*$/'],
      ['{1,} spelled out', '/(a{1,}){2,}$/'],
    ])('reports %s', (_name, code) => {
      expect(rulesFor(`export const re = ${code};`)).toEqual(['@entwico/no-unsafe-regex']);
    });

    it.each([
      ['a bounded outer quantifier', '/(a+){3}$/'],
      ['the ipv4 shape safe-regex trips over', String.raw`/^(\d{1,3}\.){3}\d{1,3}$/`],
      ['a mandatory separator between repetitions', '/(a+b)+$/'],
      ['a mandatory prefix inside the group', '/(ba+)+$/'],
      ['a single unbounded quantifier', String.raw`/^\s*(.*)$/`],
      ['sibling quantifiers over different characters', String.raw`/^\w+\s+\d+$/`],
      ['a plain group repetition', '/(abc)+$/'],
    ])('allows %s', (_name, code) => {
      expect(rulesFor(`export const re = ${code};`)).toEqual([]);
    });
  });

  describe('polynomial backtracking', () => {
    it.each([
      ['adjacent identical character sets', String.raw`/\s*\s*$/`],
      ['adjacent identical characters', '/a+a+$/'],
      ['mixed * and + over the same set', String.raw`/\d*\d+$/`],
    ])('reports %s', (_name, code) => {
      expect(rulesFor(`export const re = ${code};`)).toEqual(['@entwico/no-unsafe-regex']);
    });

    it.each([
      ['different character sets', String.raw`/\s*\d*$/`],
      ['a bounded neighbour', String.raw`/\s*\s{1,4}$/`],
      ['a literal between them', String.raw`/\s*-\s*$/`],
    ])('allows %s', (_name, code) => {
      expect(rulesFor(`export const re = ${code};`)).toEqual([]);
    });
  });

  describe('report shape', () => {
    it('points at the offending sub-expression, not the whole literal', () => {
      const [message] = messagesFor('export const re = /^x(a+)+$/;');

      // `(a+)+` begins at column 22 (1-based) and runs five characters
      expect(message?.column).toBe(22);
      expect(message?.endColumn).toBe(27);
    });

    it('names the sub-expression in the message', () => {
      const [message] = messagesFor('export const re = /(a+)+$/;');

      expect(message?.message).toContain('`(a+)+`');
      expect(message?.message).toContain('exponential');
    });

    it('distinguishes the polynomial case in the message', () => {
      const [message] = messagesFor('export const re = /a+a+$/;');

      expect(message?.message).toContain('quadratic');
    });
  });

  describe('RegExp constructor', () => {
    it('reports a pattern built from a string literal', () => {
      expect(rulesFor('export const re = new RegExp(\'(a+)+$\');')).toEqual(['@entwico/no-unsafe-regex']);
    });

    it('reports the call form as well as the new form', () => {
      expect(rulesFor('export const re = RegExp(\'(a+)+$\');')).toEqual(['@entwico/no-unsafe-regex']);
    });

    it('honours the v flag when parsing', () => {
      expect(rulesFor(String.raw`export const re = new RegExp('([\\q{ab}]+)+$', 'v');`)).toEqual([
        '@entwico/no-unsafe-regex',
      ]);
    });

    it('ignores a pattern assembled at runtime', () => {
      expect(rulesFor('export const re = (part: string) => new RegExp(part);')).toEqual([]);
    });

    it('ignores an unrelated constructor', () => {
      expect(rulesFor('export const re = new Thing(\'(a+)+\');')).toEqual([]);
    });
  });

  it('ignores an invalid pattern, leaving it to no-invalid-regexp', () => {
    expect(rulesFor('export const re = new RegExp(\'(a+\');')).toEqual([]);
  });

  it('stays quiet on ordinary regexes', () => {
    const code = [
      'export const slug = /^[a-z0-9-]+$/;',
      String.raw`export const iso = /^\d{4}-\d{2}-\d{2}$/;`,
      String.raw`export const trailing = /\s+$/;`,
    ].join('\n');

    expect(rulesFor(code)).toEqual([]);
  });
});
