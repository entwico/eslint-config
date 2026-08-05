import { describe, expect, it } from 'vitest';

import { entwicoPlugin } from '../src/plugin.js';
import type { FlatConfigArray } from '../src/types.js';
import { lint } from './helpers/lint.js';

function config(options: Record<string, unknown> = {}): FlatConfigArray {
  return [
    {
      files: ['**/*.tsx'],
      languageOptions: {
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { '@entwico': entwicoPlugin },
      rules: { '@entwico/no-inline-style': ['error', options] },
    },
  ];
}

function messages(code: string, options?: Record<string, unknown>): string[] {
  return lint(code, config(options), 'file.tsx').map((m) => m.message);
}

describe('@entwico/no-inline-style', () => {
  it('reports static values and hints the arbitrary-property class', () => {
    const [message, ...rest] = messages('const a = <div style={{ writingMode: "vertical-rl" }} />;');

    expect(rest).toEqual([]);
    expect(message).toContain('[writing-mode:vertical-rl]');
  });

  it('collapses whitespace in the hint so it stays a valid class', () => {
    expect(messages('const a = <div style={{ padding: "14px 0" }} />;')[0]).toContain('[padding:14px_0]');
  });

  it('reports every static property of a mixed object', () => {
    expect(messages('const a = <div style={{ width: 40, gap: 12, top: y }} />;')).toHaveLength(2);
  });

  it('allows genuinely dynamic values', () => {
    expect(messages('const a = <div style={{ width: `${pct}%`, color: theme.ink, top: getTop() }} />;')).toEqual([]);
  });

  it('allows css custom properties, which are the way to feed values to tailwind', () => {
    expect(messages('const a = <div style={{ "--cr-offset": "12px" }} />;')).toEqual([]);
  });

  it('reports custom properties when allowCustomProperties is off', () => {
    expect(messages('const a = <div style={{ "--cr-offset": "12px" }} />;', { allowCustomProperties: false }))
      .toHaveLength(1);
  });

  it('reports a ternary between two literals, which classes can express', () => {
    expect(messages('const a = <div style={{ color: on ? "red" : "blue" }} />;')).toHaveLength(1);
  });

  it('ignores spreads and non-object expressions', () => {
    expect(messages('const a = <div style={{ ...base }} />;')).toEqual([]);
    expect(messages('const a = <div style={styles} />;')).toEqual([]);
  });

  it('honours allowProperties in both camel and kebab spelling', () => {
    const code = 'const a = <div style={{ gridTemplateColumns: "1fr 2fr" }} />;';

    expect(messages(code, { allowProperties: ['gridTemplateColumns'] })).toEqual([]);
    expect(messages(code, { allowProperties: ['grid-template-columns'] })).toEqual([]);
  });

  it('reports a static style string attribute', () => {
    expect(messages('const a = <div style="color: red" />;')).toHaveLength(1);
  });

  it('leaves other attributes alone', () => {
    expect(messages('const a = <div data-style={{ color: "red" }} className="p-4" />;')).toEqual([]);
  });
});
