import astroscopePlugin from '@astroscope/eslint-plugin';
import i18nPlugin, { DEFAULT_IGNORE_ATTRIBUTES } from '@astroscope/eslint-plugin-i18n';
import tsParser from '@typescript-eslint/parser';
import eslintPluginAstro from 'eslint-plugin-astro';

import { JS_TS_FILES } from '../files.js';
import type { FlatConfigArray } from '../types.js';

export type AstroOptions = {
  /**
   * Enable i18n rules from @astroscope/eslint-plugin-i18n.
   * @default false
   */
  i18n?: boolean | undefined;
};

/**
 * Astro lint rules — bundles eslint-plugin-astro, jsx-a11y-strict for .astro files,
 * and @astroscope/eslint-plugin
 *
 * - eslint-plugin-astro recommended (with TS parser for frontmatter)
 * - jsx-a11y-strict for .astro files
 * - @astroscope/no-excess-jsx-props
 * - @astroscope/no-html-comments
 * - @astroscope/eslint-plugin-i18n rules when `i18n: true`
 */
export function astro(options: AstroOptions = {}): FlatConfigArray {
  const { i18n = false } = options;

  const configs: FlatConfigArray = [
    // astro rules with TypeScript parser for frontmatter
    ...eslintPluginAstro.configs.recommended.map((config) => {
      const languageOptions = config.languageOptions ?? {};
      const parserOptions =
        typeof languageOptions === 'object' && 'parserOptions' in languageOptions
          ? (languageOptions.parserOptions as Record<string, unknown>)
          : {};

      return {
        ...config,
        languageOptions: {
          ...languageOptions,
          parserOptions: {
            ...parserOptions,
            parser: tsParser,
          },
        },
      };
    }),

    // strict a11y on .astro files
    ...eslintPluginAstro.configs['jsx-a11y-strict'],

    // astroscope core rules
    {
      files: JS_TS_FILES,
      plugins: { '@astroscope': astroscopePlugin as never },
      rules: {
        '@astroscope/no-excess-jsx-props': 'error',
        '@astroscope/no-html-comments': 'error',
      },
    },
  ];

  if (i18n) {
    configs.push({
      files: JS_TS_FILES,
      plugins: { '@astroscope/i18n': i18nPlugin as never },
      rules: {
        '@astroscope/i18n/t-import-source': 'error',
        '@astroscope/i18n/no-module-level-t': 'error',
        '@astroscope/i18n/t-static-key': 'error',
        '@astroscope/i18n/t-requires-meta': 'warn',
        '@astroscope/i18n/no-t-reassign': 'error',
        '@astroscope/i18n/prefer-x-directives': 'error',
        '@astroscope/i18n/no-raw-strings-in-jsx': [
          'warn',
          { ignoreAttributes: [...DEFAULT_IGNORE_ATTRIBUTES] },
        ],
      },
    });
  }

  return configs;
}
