import * as astroParser from '@entwico/astro-eslint-parser';
import { describe, expect, it } from 'vitest';

import { entwicoPlugin } from '../src/plugin.js';
import type { FlatConfigArray } from '../src/types.js';
import { lint, ruleIds } from './helpers/lint.js';

const jsxConfig: FlatConfigArray = [
  {
    files: ['**/*.tsx'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { '@entwico': entwicoPlugin },
    rules: { '@entwico/no-style-tag': 'error' },
  },
];

const astroConfig: FlatConfigArray = [
  {
    files: ['**/*.astro'],
    languageOptions: { parser: astroParser as never },
    plugins: { '@entwico': entwicoPlugin },
    rules: { '@entwico/no-style-tag': 'error' },
  },
];

/** Surfaces parse errors instead of letting them look like "no violations". */
function astroRules(code: string): string[] {
  const messages = lint(code, astroConfig, 'file.astro');
  const fatal = messages.find((message) => message.fatal);

  if (fatal) {
    throw new Error(`parse error: ${fatal.message}`);
  }

  return ruleIds(messages);
}

describe('@entwico/no-style-tag', () => {
  it('reports a style element in jsx', () => {
    const messages = lint('const a = <style>{".card{color:red}"}</style>;', jsxConfig, 'file.tsx');
    expect(ruleIds(messages)).toEqual(['@entwico/no-style-tag']);
  });

  it('reports the opening tag, so a disable comment on the line above lands', () => {
    const [message] = lint('const a = <style>{"x"}</style>;', jsxConfig, 'file.tsx');
    expect(message?.line).toBe(1);
    expect(message?.column).toBe(11);
  });

  it('matches regardless of tag casing', () => {
    expect(ruleIds(lint('const a = <STYLE>{"x"}</STYLE>;', jsxConfig, 'file.tsx'))).toHaveLength(1);
  });

  it('leaves other elements and the style attribute alone', () => {
    const code = 'const a = <div style={{ color: "red" }} className="p-4" />;';
    expect(ruleIds(lint(code, jsxConfig, 'file.tsx'))).toEqual([]);
  });

  it('reports a style block in an astro template', () => {
    const code = '<div class="p-4">a</div>\n\n<style>\n  .card { color: red }\n</style>\n';
    expect(astroRules(code)).toEqual(['@entwico/no-style-tag']);
  });

  it('exempts define:vars, which carries values no class can', () => {
    const code = '<style define:vars={{ pct: 40 }}>\n  .bar { width: var(--pct) }\n</style>\n';
    expect(astroRules(code)).toEqual([]);
  });

  it('still reports other astro directives on a style block', () => {
    const code = '<style is:global>\n  body { margin: 0 }\n</style>\n';
    expect(astroRules(code)).toEqual(['@entwico/no-style-tag']);
  });

  it('honours a jsx-comment disable directive inside the astro template', () => {
    const code = [
      '<div class="p-4">a</div>',
      '',
      '{/* eslint-disable-next-line @entwico/no-style-tag */}',
      '<style>',
      '  @keyframes spin { to { rotate: 360deg } }',
      '</style>',
      '',
    ].join('\n');

    expect(astroRules(code)).toEqual([]);
  });

  it('honours a file-wide disable directive in the astro frontmatter', () => {
    const code = [
      '---',
      '/* eslint-disable @entwico/no-style-tag */',
      '---',
      '',
      '<style>',
      '  .card { color: red }',
      '</style>',
      '',
    ].join('\n');

    expect(astroRules(code)).toEqual([]);
  });
});
