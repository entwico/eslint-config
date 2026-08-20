import * as astroParser from '@entwico/astro-eslint-parser';
import { describe, expect, it } from 'vitest';

import { entwicoPlugin } from '../src/plugin.js';
import type { FlatConfigArray } from '../src/types.js';
import { lint, ruleIds } from './helpers/lint.js';

const astroConfig: FlatConfigArray = [
  {
    files: ['**/*.astro'],
    languageOptions: { parser: astroParser as never },
    plugins: { '@entwico': entwicoPlugin },
    rules: { '@entwico/astro-no-class-list': 'error' },
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

describe('@entwico/astro-no-class-list', () => {
  it('reports class:list with an expression value', () => {
    const code = '<div class:list={["p-4", cond && "hidden"]}>a</div>\n';
    expect(astroRules(code)).toEqual(['@entwico/astro-no-class-list']);
  });

  it('reports class:list with a static string value', () => {
    const code = '<div class:list="p-4 flex">a</div>\n';
    expect(astroRules(code)).toEqual(['@entwico/astro-no-class-list']);
  });

  it('reports the template-literal form', () => {
    const code = '<div class:list=`p-4 ${extra}`>a</div>\n';
    expect(astroRules(code)).toEqual(['@entwico/astro-no-class-list']);
  });

  it('leaves a plain class attribute alone', () => {
    const code = '<div class={cn("p-4", cond && "hidden")}>a</div>\n';
    expect(astroRules(code)).toEqual([]);
  });

  it('leaves other namespaced directives alone', () => {
    const code = '<Widget client:load class="p-4" set:text={value} />\n';
    expect(astroRules(code)).toEqual([]);
  });

  it('honours a jsx-comment disable directive inside the astro template', () => {
    const code = [
      '{/* eslint-disable-next-line @entwico/astro-no-class-list */}',
      '<div class:list={["p-4"]}>a</div>',
      '',
    ].join('\n');

    expect(astroRules(code)).toEqual([]);
  });
});
