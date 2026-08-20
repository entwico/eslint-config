import { describe, expect, it } from 'vitest';

import { css } from '../src/presets/css.js';
import { lint, lintFix } from './helpers/lint.js';

const TAILWIND = { entryPoint: 'src/styles/index.css' };

const RULE = '@entwico/tailwind-prefer-apply';

async function firing(code: string, options?: Parameters<typeof css>[0]) {
  return lint(code, await css(options ?? { tailwind: TAILWIND }), 'a.css')
    .filter((message) => message.ruleId === RULE);
}

describe('@entwico/tailwind-prefer-apply', () => {
  it('stays silent in files where @apply cannot resolve', async () => {
    const plain = '.embed { margin: 6.5px 0; color: rgb(45 103 171); }';

    expect(await firing(plain)).toEqual([]);
  });

  it('reports raw declarations in the tailwind entry', async () => {
    const entry = '@import "tailwindcss";\n.card { display: flex; }';

    const messages = await firing(entry);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.message).toContain('`display`');
    expect(messages[0]?.message).toContain('[display:flex]');
  });

  it('reports raw declarations in @reference-d files, leaving @apply alone', async () => {
    const referenced = [
      '@reference "./index.css";',
      '.widget { @apply flex flex-col; }',
      '.widget-title { font-weight: 500; }',
    ].join('\n');

    const messages = await firing(referenced);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.message).toContain('`font-weight`');
  });

  it('suggests the important suffix', async () => {
    const messages = await firing('@import "tailwindcss";\n.card { height: auto !important; }');

    expect(messages[0]?.message).toContain('[height:auto]!');
  });

  it('never reports custom properties or descriptor contexts', async () => {
    const code = [
      '@import "tailwindcss";',
      ':root { --brand: #0d1f5f; }',
      '@theme { --color-brand: #0d1f5f; }',
      '@keyframes fade { from { opacity: 0; } to { opacity: 1; } }',
      '@font-face { font-family: Inter; src: url("inter.woff2"); }',
    ].join('\n');

    expect(await firing(code)).toEqual([]);
  });

  it('reports inside grouping at-rules and @utility bodies', async () => {
    const code = [
      '@import "tailwindcss";',
      '@media (min-width: 768px) { .card { gap: 1rem; } }',
      '@layer base { body { margin: 0; } }',
      '@utility flex-equal { flex-shrink: 0; }',
    ].join('\n');

    expect(await firing(code)).toHaveLength(3);
  });

  it('reports declarations in @utility bodies that also hold nested rules', async () => {
    const code = [
      '@import "tailwindcss";',
      '@utility scrollbar-hide {',
      '  scrollbar-width: none;',
      '  &::-webkit-scrollbar { display: none; }',
      '  @apply select-none;',
      '}',
    ].join('\n');

    const messages = await firing(code);

    expect(messages.map((message) => message.line)).toEqual([3, 4]);
  });

  it('honours allowProperties and the off switch', async () => {
    const code = '@import "tailwindcss";\nimg { -webkit-user-drag: none; }';

    expect(await firing(code)).toHaveLength(1);
    expect(await firing(code, { tailwind: { ...TAILWIND, preferApply: { allowProperties: ['-webkit-user-drag'] } } }))
      .toEqual([]);
    expect(await firing(code, { tailwind: { ...TAILWIND, preferApply: false } })).toEqual([]);
  });

  it('autofixes to the output-identical arbitrary-property class, merged by tailwind-apply-once', async () => {
    const code = '@import "tailwindcss";\n.card { display: flex; height: auto !important; }';

    expect(lintFix(code, await css({ tailwind: TAILWIND }), 'a.css'))
      .toBe('@import "tailwindcss";\n.card { @apply [display:flex] [height:auto]!; }');
  });

  it('does not autofix values a candidate cannot carry', async () => {
    const code = '@import "tailwindcss";\n.card { animation-name: fade_in; }';

    const messages = await firing(code);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.message).not.toContain('@apply [');
    expect(lintFix(code, await css({ tailwind: TAILWIND }), 'a.css')).toBe(code);
  });

  it('is not registered without tailwind options', async () => {
    const entry = '@import "tailwindcss";\n.card { display: flex; }';

    expect(await firing(entry, {})).toEqual([]);
  });
});
