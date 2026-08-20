import * as astroEslintParser from '@entwico/astro-eslint-parser';
import tsParser from '@typescript-eslint/parser';
import { describe, expect, it } from 'vitest';

import { astro } from '../src/presets/astro.js';
import { react } from '../src/presets/react.js';
import type { FlatConfigArray } from '../src/types.js';
import { loadA11y } from '../src/utils/a11y.js';
import { lint, ruleIds } from './helpers/lint.js';

// minimal astro-file config: parser without a type service (a11y rules are not type-aware)
const astroConfig = async (): Promise<FlatConfigArray> => {
  const a11y = await loadA11y();

  return [
    {
      files: ['**/*.astro'],
      plugins: { 'jsx-a11y': a11y.plugin },
      languageOptions: {
        parser: astroEslintParser,
        parserOptions: { parser: tsParser },
      },
      rules: a11y.strictRules,
    },
  ];
};

describe('a11y wrapper', () => {
  it('fires on astro template elements', async () => {
    const code = '<img src="x.png" />\n';
    const messages = lint(code, (await astroConfig()), 'page.astro');

    expect(ruleIds(messages)).toContain('jsx-a11y/alt-text');
  });

  it('maps the html `autofocus` spelling to the react name the base rule matches on', async () => {
    const code = '<button autofocus>ok</button>\n';
    const messages = lint(code, (await astroConfig()), 'page.astro');

    expect(ruleIds(messages)).toContain('jsx-a11y/no-autofocus');
  });

  it('reaches JSXAttribute visitors for astro shorthand attributes', async () => {
    const code = '---\nconst scope = \'row\';\n---\n\n<div {scope}>x</div>\n';
    const messages = lint(code, (await astroConfig()), 'page.astro');

    expect(ruleIds(messages)).toContain('jsx-a11y/scope');
  });

  it('bridges the classic `jsx-a11y` settings key to the fork', async () => {
    const a11y = await loadA11y();
    const config: FlatConfigArray = [
      {
        files: ['**/*.jsx'],
        plugins: { 'jsx-a11y': a11y.plugin },
        languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
        settings: { 'jsx-a11y': { components: { Image: 'img' } } },
        rules: { 'jsx-a11y/alt-text': 'error' },
      },
    ];
    const messages = lint('export const X = () => <Image src="x.png" />;', config, 'a.jsx');

    expect(ruleIds(messages)).toContain('jsx-a11y/alt-text');
  });

  it('registers the identical plugin object in the react and astro presets', async () => {
    const [reactConfigs, astroConfigs] = await Promise.all([react(), astro()]);
    const pluginOf = (configs: FlatConfigArray): unknown =>
      configs.find((config) => config.plugins?.['jsx-a11y'])?.plugins?.['jsx-a11y'];

    expect(pluginOf(reactConfigs)).toBeDefined();
    // flat config rejects the same plugin name mapped to two different objects
    expect(pluginOf(reactConfigs)).toBe(pluginOf(astroConfigs));
  });

  it('enables strict a11y rules on .astro files in the astro preset', async () => {
    const configs = await astro();
    const block = configs.find((config) => config.rules?.['jsx-a11y/alt-text'] !== undefined);

    expect(block?.files).toEqual(['**/*.astro']);
    expect(block?.rules?.['jsx-a11y/alt-text']).toBe('error');
  });

  it('leaves no plugin-astro a11y wrapper rules enabled', async () => {
    const configs = await astro();
    const enabledIds = configs.flatMap((config) => Object.keys(config.rules ?? {}));

    expect(enabledIds.filter((id) => id.startsWith('astro/jsx-a11y/'))).toEqual([]);
  });
});
