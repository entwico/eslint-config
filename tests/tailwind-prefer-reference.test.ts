import { describe, expect, it } from 'vitest';

import { css } from '../src/presets/css.js';
import { lint, lintFix } from './helpers/lint.js';

const TAILWIND = { entryPoint: 'src/styles/index.css' };

const RULE = '@entwico/tailwind-prefer-reference';

async function firing(code: string, options?: Parameters<typeof css>[0]) {
  return lint(code, await css(options ?? { tailwind: TAILWIND }), 'a.css')
    .filter((message) => message.ruleId === RULE);
}

describe('@entwico/tailwind-prefer-reference', () => {
  it('reports once per plain stylesheet with class-expressible styling', async () => {
    const plain = '.embed { margin: 6.5px 0; color: rgb(45 103 171); }\n.other { display: block; }';

    const messages = await firing(plain);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.message).toContain('src/styles/index.css');
  });

  it('stays silent once @apply is resolvable, regardless of raw declarations', async () => {
    expect(await firing('@reference "./index.css";\n.widget { font-weight: 500; }')).toEqual([]);
    expect(await firing('@import "tailwindcss";\n.card { display: flex; }')).toEqual([]);
  });

  it('stays silent when @reference would enable nothing', async () => {
    const inexpressible = [
      '@import "./other.css";',
      ':root { --brand: #0d1f5f; }',
      '@keyframes fade { from { opacity: 0; } to { opacity: 1; } }',
      '@font-face { font-family: Inter; src: url("inter.woff2"); }',
    ].join('\n');

    expect(await firing(inexpressible)).toEqual([]);
  });

  it('is excused by a file-level eslint-disable', async () => {
    const excused = [
      '/* eslint-disable @entwico/tailwind-prefer-reference -- deliberately outside tailwind */',
      '.embed { margin: 6.5px 0; }',
    ].join('\n');

    expect(await firing(excused)).toEqual([]);
  });

  it('autofixes by inserting @reference with the path relative to the entry, then hands over to tailwind-prefer-apply', async () => {
    const root = process.cwd();
    const config = await css({ root, tailwind: TAILWIND });
    const fixed = lintFix('.embed { display: flex; }\n', config, `${root}/src/styles/vendor/embed.css`);

    expect(fixed).toBe('@reference "../index.css";\n\n.embed { @apply [display:flex]; }\n');
  });

  it('reports without a fix when the filename is not absolute', async () => {
    const config = await css({ root: process.cwd(), tailwind: TAILWIND });

    expect(lintFix('.embed { display: flex; }', config, 'embed.css')).toBe('.embed { display: flex; }');
    expect(await firing('.embed { display: flex; }')).toHaveLength(1);
  });

  it('is not registered without tailwind options', async () => {
    expect(await firing('.embed { margin: 6.5px 0; }', {})).toEqual([]);
  });
});
