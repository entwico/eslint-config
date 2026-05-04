import astroscopePlugin from '@astroscope/eslint-plugin';
import i18nPlugin, { DEFAULT_IGNORE_ATTRIBUTES } from '@astroscope/eslint-plugin-i18n';
import tsParser from '@typescript-eslint/parser';
import eslintPluginAstro from 'eslint-plugin-astro';

import { JS_TS_FILES } from '../files.js';
import type { FlatConfigArray } from '../types.js';

export type AstroI18nOptions = {
  /** Attribute names added to the i18n no-raw-strings ignore list. */
  ignoreAttributes?: string[] | undefined;
};

export type AstroOptions = {
  /** Enable @astroscope/i18n rules. Pass an object to extend ignored attributes. */
  i18n?: boolean | AstroI18nOptions | undefined;
};

/** Astro + @astroscope/eslint-plugin rules. */
export function astro(options: AstroOptions = {}): FlatConfigArray {
  const { i18n = false } = options;
  const i18nEnabled = i18n !== false;
  const i18nIgnoreAttributes = typeof i18n === 'object' ? (i18n.ignoreAttributes ?? []) : [];

  const configs: FlatConfigArray = [
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

    ...eslintPluginAstro.configs['jsx-a11y-strict'],

    {
      files: JS_TS_FILES,
      plugins: { '@astroscope': astroscopePlugin as never },
      rules: {
        '@astroscope/no-excess-jsx-props': 'error',
        '@astroscope/no-html-comments': 'error',
      },
    },
  ];

  if (i18nEnabled) {
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
          { ignoreAttributes: [...DEFAULT_IGNORE_ATTRIBUTES, ...i18nIgnoreAttributes] },
        ],
      },
    });
  }

  return configs;
}
