import { describe, expect, it } from 'vitest';

import { css } from '../src/presets/css.js';
import { lint, lintFix } from './helpers/lint.js';

const TAILWIND = { entryPoint: 'src/styles/index.css' };

const RULE = '@entwico/tailwind-apply-once';

async function run(code: string, options?: Parameters<typeof css>[0]) {
  const config = await css(options ?? { tailwind: TAILWIND });

  return {
    messages: lint(code, config, 'a.css').filter((message) => message.ruleId === RULE),
    fixed: lintFix(code, config, 'a.css'),
  };
}

describe('@entwico/tailwind-apply-once', () => {
  it('merges consecutive @apply lines in order', async () => {
    const code = '@reference "./index.css";\n.x {\n  @apply w-full;\n  @apply h-full;\n  @apply flex;\n}\n';

    const { messages, fixed } = await run(code);

    expect(messages).toHaveLength(2);
    expect(fixed).toBe('@reference "./index.css";\n.x {\n  @apply w-full h-full flex;\n}\n');
  });

  it('collapses a multiline prelude while merging', async () => {
    const code = '@reference "./index.css";\n.x {\n  @apply w-full;\n  @apply h-full\n    flex;\n}\n';

    const { fixed } = await run(code);

    expect(fixed).toBe('@reference "./index.css";\n.x {\n  @apply w-full h-full flex;\n}\n');
  });

  it('reports but does not merge across an intervening declaration', async () => {
    const code = '@reference "./index.css";\n.x {\n  @apply w-full;\n  animation-name: fade_in;\n  @apply h-full;\n}\n';

    const { messages, fixed } = await run(code);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.fix).toBeUndefined();
    expect(fixed).toBe(code);
  });

  it('stays silent on a single @apply and is not registered without tailwind options', async () => {
    const single = '@reference "./index.css";\n.x { @apply w-full h-full; }';
    const split = '@reference "./index.css";\n.x { @apply w-full; @apply h-full; }';

    const singleResult = await run(single);
    const noTailwind = await run(split, {});

    expect(singleResult.messages).toEqual([]);
    expect(noTailwind.messages).toEqual([]);
  });
});
