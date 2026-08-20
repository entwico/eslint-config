import { describe, expect, it } from 'vitest';

import { css } from '../src/presets/css.js';
import { lint, ruleIds } from './helpers/lint.js';

const TAILWIND = { entryPoint: 'src/styles/index.css' };

function cssBlock(config: Awaited<ReturnType<typeof css>>) {
  return config.find((block) => block.language === 'css/css');
}

function cssRules(config: Awaited<ReturnType<typeof css>>): Record<string, unknown> {
  return (cssBlock(config)?.rules ?? {}) as Record<string, unknown>;
}

describe('css preset', () => {
  it('wires @eslint/css as the language for .css', async () => {
    const block = cssBlock(await css());

    expect(block?.files).toEqual(['**/*.css']);
    expect((block?.plugins as Record<string, unknown>).css).toBeDefined();
    expect((block?.languageOptions as Record<string, unknown>).tolerant).toBe(true);
  });

  it('takes custom file patterns', async () => {
    expect(cssBlock(await css({ files: ['src/**/*.css'] }))?.files).toEqual(['src/**/*.css']);
  });

  it('reports the @eslint/css recommended defects', async () => {
    const code = [
      '@import \'a.css\';',
      '@import \'a.css\';',
      '.empty {}',
      '.loud { color: red !important; }',
      '.font { font-family: Inter; }',
      '@bogus-at-rule { color: red; }',
      '@keyframes dup { from { opacity: 0; } from { opacity: 1; } }',
    ].join('\n');

    expect(ruleIds(lint(code, await css(), 'a.css'))).toEqual(
      expect.arrayContaining([
        'css/no-duplicate-imports',
        'css/no-empty-blocks',
        'css/no-important',
        'css/font-family-fallbacks',
        'css/no-invalid-at-rules',
        'css/no-duplicate-keyframe-selectors',
      ]),
    );
  });

  it('does not report a var() the rule cannot resolve — runtime-injected or declared elsewhere', async () => {
    const config = await css();

    expect(cssRules(config)['css/no-invalid-properties']).toEqual(['error', { allowUnknownVariables: true }]);
    expect(ruleIds(lint('.a { height: var(--radix-accordion-content-height); }', config, 'a.css')))
      .not.toContain('css/no-invalid-properties');
    expect(ruleIds(lint('@theme { --color-brand: red; }\n.a { color: var(--color-brand); }', config, 'a.css')))
      .not.toContain('css/no-invalid-properties');
  });

  it('still reports unknown properties and values that do not fit their property', async () => {
    const config = await css();

    expect(ruleIds(lint('.a { colr: red; }', config, 'a.css'))).toContain('css/no-invalid-properties');
    expect(ruleIds(lint('.a { color: 12px; }', config, 'a.css'))).toContain('css/no-invalid-properties');
    expect(ruleIds(lint('.a { color: red; }', config, 'a.css'))).not.toContain('css/no-invalid-properties');
  });

  // suppression-on-every-legal-use: unguarded progressive enhancement is the
  // normal pattern, and the rule cannot see -webkit- fallbacks
  it('never runs use-baseline', async () => {
    const modern = [
      '.a { text-wrap: pretty; }',
      'img { -webkit-user-select: none; user-select: none; -webkit-user-drag: none; }',
    ].join('\n');

    expect(cssRules(await css())['css/use-baseline']).toBe('off');
    expect(ruleIds(lint(modern, await css(), 'a.css'))).toEqual([]);
  });

  it('rejects tailwind at-rules without tailwind options', async () => {
    const messages = lint('@theme { --color-brand: red; }', await css(), 'a.css');

    expect(ruleIds(messages)).toContain('css/no-invalid-at-rules');
  });

  // the better-tailwindcss rules self-disable without a `tailwindcss` install,
  // which this package has no reason to carry — their firing is exercised in demo/react
  it('parses the tailwind at-rules once tailwind options are passed', async () => {
    const code = [
      '@theme { --color-brand: red; }',
      '@custom-variant hocus (&:hover, &:focus);',
      '@utility btn { @apply p-4 text-white; }',
      '@layer components { .card { @apply rounded-lg; } }',
    ].join('\n');

    const messages = lint(code, await css({ tailwind: TAILWIND }), 'a.css');

    expect(ruleIds(messages)).not.toContain('css/no-invalid-at-rules');
    expect(messages.some((message) => message.fatal)).toBe(false);
  });

  // the stock grammar rejects these one shape at a time; class validation is
  // better-tailwindcss's job, so the @apply prelude accepts anything
  it('accepts every real candidate shape inside @apply', async () => {
    const code = [
      '@utility cr-h1 { @apply font-serif text-[52px]/[1.05] font-medium tracking-[-0.02em]; }',
      '@utility cr-body { @apply text-[14px]/[1.55] text-(--cr-ink-2); }',
      '.a { @apply hover:bg-red-500 md:[&>*]:flex-1 bg-blue-500!; }',
    ].join('\n');

    const messages = lint(code, await css({ tailwind: TAILWIND }), 'a.css');

    expect(ruleIds(messages)).not.toContain('css/no-invalid-at-rules');
    expect(messages.some((message) => message.fatal)).toBe(false);
  });

  it('still reports at-rules that are genuinely unknown', async () => {
    expect(ruleIds(lint('.a { @applyy flex; }', await css({ tailwind: TAILWIND }), 'a.css')))
      .toContain('css/no-invalid-at-rules');
  });

  it('carries the tailwind settings and rule tweaks onto the css block', async () => {
    const config = await css({ tailwind: { ...TAILWIND, ignoreClasses: ['^swiper-'] } });
    const settings = cssBlock(config)?.settings as { 'better-tailwindcss': Record<string, unknown> };

    expect(settings['better-tailwindcss'].entryPoint).toBe('src/styles/index.css');
    expect(cssRules(config)['better-tailwindcss/no-unknown-classes']).toEqual(['error', { ignore: ['^swiper-'] }]);
    expect(cssRules(config)['better-tailwindcss/enforce-shorthand-classes']).toBe('off');
  });

  it('keeps the entwico markup rules out of the css block', async () => {
    const rules = cssRules(await css({ tailwind: TAILWIND }));

    expect(rules['@entwico/no-inline-style']).toBeUndefined();
    expect(rules['@entwico/no-style-tag']).toBeUndefined();
  });

  it('picks the tailwind 3 syntax when asked', async () => {
    const v3 = await css({ tailwind: { ...TAILWIND, version: 3 } });
    const v4 = await css({ tailwind: TAILWIND });

    expect(ruleIds(lint('@tailwind base;', v3, 'a.css'))).not.toContain('css/no-invalid-at-rules');
    expect(ruleIds(lint('@tailwind base;', v4, 'a.css'))).toContain('css/no-invalid-at-rules');
    expect(ruleIds(lint('.a { @apply text-[52px]/[1.05] hover:opacity-50 !important; }', v3, 'a.css')))
      .not.toContain('css/no-invalid-at-rules');
  });
});
