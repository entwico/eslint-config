import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ESLint } from 'eslint';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { defineConfig } from '../src/define-config.js';

const demoDir = path.resolve(import.meta.dirname, '../demo/astro');
const fixtureDir = path.join(demoDir, 'src', 'lint-fixture-tmp');

/* eslint-disable unicorn/no-incorrect-template-string-interpolation -- fixture sources contain JSX braces */
const widgetTsx = `import type { FunctionComponent } from 'react';

export type WidgetProps = {
  items: string[];
  onPick: (value: string) => void;
};

export const Widget: FunctionComponent<WidgetProps> = ({ items, onPick }) => (
  <ul>
    {items.map((item) => (
      <li key={item}>
        <button type="button" onClick={() => onPick(item)}>
          {item}
        </button>
      </li>
    ))}
  </ul>
);
`;

const checkAstro = `---
import { Counter } from '../components/Counter';
import { Widget } from './Widget';

const onPick = (): void => {};
const counterProps = { initial: 1, leakedSecret: 'oops' };
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Check</title>
  </head>

  <body>
    <Counter client:load {...counterProps} />

    <Widget client:load items={['a']} onPick={onPick} />
  </body>
</html>
`;
/* eslint-enable unicorn/no-incorrect-template-string-interpolation */

// end-to-end over the astro demo: the merged flat config must resolve to the forked parser
// and the project service must deliver type info to .astro files — a structural check on the
// preset array cannot catch a later block overriding the parser (flat-config later-wins)
describe('astro project service integration', () => {
  const createEslint = () =>
    new ESLint({
      cwd: demoDir,
      overrideConfigFile: true,
      overrideConfig: defineConfig({ root: demoDir, astro: true, react: true }) as never,
    });

  beforeAll(async () => {
    await mkdir(fixtureDir, { recursive: true });
    await writeFile(path.join(fixtureDir, 'Widget.tsx'), widgetTsx);
    await writeFile(path.join(fixtureDir, 'check.astro'), checkAstro);
  });

  afterAll(async () => {
    await rm(fixtureDir, { recursive: true, force: true });
  });

  it('resolves the forked parser in the merged config for .astro files', async () => {
    const config = (await createEslint().calculateConfigForFile(
      path.join(demoDir, 'src/pages/index.astro'),
    )) as { languageOptions?: { parser?: { meta?: { name?: string } } } };

    expect(config.languageOptions?.parser?.meta?.name).toBe('@entwico/astro-eslint-parser');
  });

  it('fires the type-aware @astroscope rules on .astro without parser warnings', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const [result] = await createEslint().lintFiles([path.join(fixtureDir, 'check.astro')]);
      const ruleIds = (result?.messages ?? []).map((message) => message.ruleId);

      expect(ruleIds).toContain('@astroscope/no-excess-jsx-props');
      expect(ruleIds).toContain('@astroscope/island-readonly');
      expect(ruleIds).toContain('@astroscope/island-not-serializable');

      // the stock parser downgrades `projectService` to `project: true` with a console.warn
      const parserWarnings = warn.mock.calls.filter((call) =>
        String(call[0]).includes('does not support the `projectService`'),
      );

      expect(parserWarnings).toEqual([]);
    } finally {
      warn.mockRestore();
    }
  }, 60_000);
});
