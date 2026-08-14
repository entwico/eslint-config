import * as astroParser from '@entwico/astro-eslint-parser';
import { describe, expect, it } from 'vitest';
import { entwicoPlugin } from '../src/plugin.js';
import type { FlatConfigArray } from '../src/types.js';
import { lint, ruleIds } from './helpers/lint.js';

const RLO = String.fromCodePoint(0x20_2E);
const PDI = String.fromCodePoint(0x20_69);
const RLM = String.fromCodePoint(0x20_0F);

const config = (options: unknown[] = []): FlatConfigArray => [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { '@entwico': entwicoPlugin },
    rules: { '@entwico/no-bidi-characters': ['error', ...options] },
  },
];

const astroConfig: FlatConfigArray = [
  {
    files: ['**/*.astro'],
    languageOptions: { parser: astroParser as never },
    plugins: { '@entwico': entwicoPlugin },
    rules: { '@entwico/no-bidi-characters': 'error' },
  },
];

describe('@entwico/no-bidi-characters', () => {
  it('reports an override hidden in a comment', () => {
    const messages = lint(`// if (admin)${RLO} return;\nexport const x = 1;`, config(), 'a.ts');

    expect(ruleIds(messages)).toEqual(['@entwico/no-bidi-characters']);
    expect(messages[0]?.message).toContain('U+202E RIGHT-TO-LEFT OVERRIDE');
  });

  it('reports an override inside string content', () => {
    const messages = lint(`export const x = 'a${RLO}b';`, config(), 'a.ts');

    expect(ruleIds(messages)).toEqual(['@entwico/no-bidi-characters']);
  });

  it('reports every occurrence, not just the first', () => {
    const messages = lint(`export const x = '${RLO}${PDI}';`, config(), 'a.ts');

    expect(ruleIds(messages)).toEqual(['@entwico/no-bidi-characters', '@entwico/no-bidi-characters']);
  });

  it('points at the character itself', () => {
    const messages = lint(`export const x = 'ab${RLO}';`, config(), 'a.ts');

    expect(messages[0]?.line).toBe(1);
    expect(messages[0]?.column).toBe(21);
    expect(messages[0]?.endColumn).toBe(22);
  });

  it('leaves the escaped form alone — an escape is visible to the reader', () => {
    // the escape sequence spelled out, not the character it denotes
    const backslash = String.fromCodePoint(0x5C);
    const messages = lint(`export const x = '${backslash}u202e';`, config(), 'a.ts');

    expect(ruleIds(messages)).toEqual([]);
  });

  it('reports directional marks by default', () => {
    const messages = lint(`export const x = 'a${RLM}b';`, config(), 'a.ts');

    expect(ruleIds(messages)).toEqual(['@entwico/no-bidi-characters']);
  });

  it('allows directional marks under allowMarks, but never overrides', () => {
    const allowed = lint(`export const x = 'a${RLM}b';`, config([{ allowMarks: true }]), 'a.ts');

    expect(ruleIds(allowed)).toEqual([]);

    const stillReported = lint(`export const x = 'a${RLO}b';`, config([{ allowMarks: true }]), 'a.ts');

    expect(ruleIds(stillReported)).toEqual(['@entwico/no-bidi-characters']);
  });

  it('reports in jsx text, which is not a token', () => {
    const messages = lint(`export const a = <p>hello${RLO}</p>;`, config(), 'a.tsx');

    expect(ruleIds(messages)).toEqual(['@entwico/no-bidi-characters']);
  });

  it('reports in astro template markup', () => {
    const messages = lint(`<p>hello${RLO}</p>`, astroConfig, 'file.astro');
    const fatal = messages.find((message) => message.fatal);

    if (fatal) {
      throw new Error(`parse error: ${fatal.message}`);
    }

    expect(ruleIds(messages)).toEqual(['@entwico/no-bidi-characters']);
  });

  it('stays quiet on clean source', () => {
    const messages = lint('// plain ascii\nexport const x = "grüße";', config(), 'a.ts');

    expect(ruleIds(messages)).toEqual([]);
  });
});
