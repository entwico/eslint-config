import * as astroParser from '@entwico/astro-eslint-parser';
import { describe, expect, it } from 'vitest';

import { entwicoPlugin } from '../src/plugin.js';
import { astro } from '../src/presets/astro.js';
import type { FlatConfigArray } from '../src/types.js';
import { lint, lintFix, ruleIds } from './helpers/lint.js';

const RULE = '@entwico/astro-prefer-early-return';

const astroConfig: FlatConfigArray = [
  {
    files: ['**/*.astro'],
    languageOptions: { parser: astroParser as never },
    plugins: { '@entwico': entwicoPlugin },
    rules: { [RULE]: 'error' },
  },
];

/** Surfaces parse errors and unmatched filenames instead of letting them look like "no violations". */
function run(code: string, filename = 'file.astro'): { rules: string[]; fixed: string; message: string | undefined } {
  const messages = lint(code, astroConfig, filename);
  const unexpected = messages.find((message) => message.ruleId === null);

  if (unexpected) {
    throw new Error(`lint did not run: ${unexpected.message}`);
  }

  return { rules: ruleIds(messages), fixed: lintFix(code, astroConfig, filename), message: messages[0]?.message };
}

const frontmatter = (body: string): string => `---\n${body}\n---\n\n`;

describe(RULE, () => {
  it('moves an `&&` guard into the frontmatter and unwraps the markup', () => {
    const code = [
      frontmatter('const items = load();'),
      '{',
      '  items.length > 0 && (',
      '    <ul class="list">',
      '      {items.map((item) => (',
      '        <li>{item}</li>',
      '      ))}',
      '    </ul>',
      '  )',
      '}',
      '',
    ].join('\n');

    const { rules, fixed, message } = run(code);

    expect(rules).toEqual([RULE]);
    expect(message).toContain('if (!(items.length > 0)) return;');
    expect(fixed).toBe(
      [
        frontmatter('const items = load();\n\nif (!(items.length > 0)) {\n  return;\n}'),
        '<ul class="list">',
        '  {items.map((item) => (',
        '    <li>{item}</li>',
        '  ))}',
        '</ul>',
        '',
      ].join('\n'),
    );
  });

  it('handles `cond ? markup : null` and `cond ? null : markup`', () => {
    const truthy = run(`${frontmatter('const { open } = Astro.props;')}{open ? <div>a</div> : null}\n`);
    const falsy = run(`${frontmatter('const { hidden } = Astro.props;')}{hidden ? undefined : <div>a</div>}\n`);

    expect(truthy.rules).toEqual([RULE]);
    expect(truthy.fixed).toBe(`${frontmatter('const { open } = Astro.props;\n\nif (!open) {\n  return;\n}')}<div>a</div>\n`);
    expect(falsy.rules).toEqual([RULE]);
    expect(falsy.fixed).toBe(`${frontmatter('const { hidden } = Astro.props;\n\nif (hidden) {\n  return;\n}')}<div>a</div>\n`);
  });

  it('negates the condition without double negation or wrong precedence', () => {
    const guardFor = (condition: string): string => {
      const { fixed } = run(`${frontmatter('const x = 1;')}{${condition} && <div>a</div>}\n`);

      return /if \((.*)\) \{/.exec(fixed)?.[1] ?? '';
    };

    expect(guardFor('!!icon')).toBe('!icon');
    expect(guardFor('!icon')).toBe('icon');
    expect(guardFor('a === b')).toBe('a !== b');
    expect(guardFor('a !== b')).toBe('a === b');
    expect(guardFor('a && b')).toBe('!(a && b)');
    expect(guardFor('(a ?? b)')).toBe('!(a ?? b)');
    expect(guardFor('items.length > 0')).toBe('!(items.length > 0)');
    expect(guardFor('Astro.slots.has("default")')).toBe('!Astro.slots.has("default")');
    expect(guardFor('a?.b')).toBe('!a?.b');
  });

  it('keeps the braces when the guarded content is not markup', () => {
    const code = [
      frontmatter('const { visible, wrap } = Astro.props;'),
      '{',
      '  visible &&',
      '  (wrap',
      '    ? (',
      '        <div><slot /></div>',
      '      )',
      '    : (',
      '        <slot />',
      '      ))',
      '}',
      '',
    ].join('\n');

    const { rules, fixed } = run(code);

    expect(rules).toEqual([RULE]);
    expect(fixed).toBe(
      [
        frontmatter('const { visible, wrap } = Astro.props;\n\nif (!visible) {\n  return;\n}'),
        '{',
        '  wrap',
        '   ? (',
        '       <div><slot /></div>',
        '     )',
        '   : (',
        '       <slot />',
        '     )',
        '}',
        '',
      ].join('\n'),
    );
  });

  it('inserts into an empty frontmatter, or creates one when the file has none', () => {
    const empty = run('---\n---\n\n{Astro.slots.has("default") && <div><slot /></div>}\n');
    const none = run('{Astro.slots.has("default") && <div><slot /></div>}\n');

    expect(empty.fixed).toBe('---\nif (!Astro.slots.has("default")) {\n  return;\n}\n---\n\n<div><slot /></div>\n');
    expect(none.fixed).toBe('---\nif (!Astro.slots.has("default")) {\n  return;\n}\n---\n\n<div><slot /></div>\n');
  });

  it('stays silent when the guard is not the sole template root', () => {
    const twoGuards = `${frontmatter('const { icon } = Astro.props;')}{!!icon && <b>a</b>}\n{!icon && <i>b</i>}\n`;
    const withScript = `${frontmatter('const { on } = Astro.props;')}{on && <div>a</div>}\n<script>console.log(1);</script>\n`;
    const nested = `${frontmatter('const { on } = Astro.props;')}<div>{on && <b>a</b>}</div>\n`;

    expect(run(twoGuards).rules).toEqual([]);
    expect(run(withScript).rules).toEqual([]);
    expect(run(nested).rules).toEqual([]);
  });

  it('stays silent on a ternary with two rendering branches and on `||`', () => {
    const either = `${frontmatter('const { on } = Astro.props;')}{on ? <b>a</b> : <i>b</i>}\n`;
    const fallback = `${frontmatter('const { label } = Astro.props;')}{label || <i>none</i>}\n`;

    expect(run(either).rules).toEqual([]);
    expect(run(fallback).rules).toEqual([]);
  });

  it('skips routes under pages/ but not the `_`-prefixed components living there', () => {
    const code = `${frontmatter('const { on } = Astro.props;')}{on && <div>a</div>}\n`;

    // filenames stay cwd-relative: the linter matches `files` against its base path
    expect(run(code, 'src/pages/index.astro').rules).toEqual([]);
    expect(run(code, 'src/pages/blog/[slug].astro').rules).toEqual([]);
    expect(run(code, 'src/pages/_Hero.astro').rules).toEqual([RULE]);
    expect(run(code, 'src/pages/blog/_components/Hero.astro').rules).toEqual([RULE]);
    expect(run(code, 'src/components/Hero.astro').rules).toEqual([RULE]);
  });

  it('honours a jsx-comment disable directive inside the astro template', () => {
    const code = [
      frontmatter('const { on } = Astro.props;'),
      '{/* eslint-disable-next-line @entwico/astro-prefer-early-return */}',
      '{on && <div>a</div>}',
      '',
    ].join('\n');

    expect(run(code).rules).toEqual([]);
  });
});

describe('astro preset wiring', () => {
  it('enables the rule on .astro files', async () => {
    const config = await astro();

    const block = config.find((entry) => entry.rules?.[RULE] === 'error');

    expect(block?.files).toEqual(['**/*.astro']);
    expect(block?.plugins?.['@entwico']).toBe(entwicoPlugin);
  });
});
