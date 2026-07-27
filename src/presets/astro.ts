import astroscopePlugin, { DEFAULT_IGNORE_ATTRIBUTES, i18nPlugin } from '@astroscope/eslint-plugin';
import * as astroEslintParser from '@entwico/astro-eslint-parser';
import tsParser from '@typescript-eslint/parser';
import eslintPluginAstro from 'eslint-plugin-astro';

import { JS_TS_FILES } from '../files.js';
import type { FlatConfig, FlatConfigArray } from '../types.js';

type PluginConfigs = { configs?: Record<string, { rules?: FlatConfig['rules'] }[]> };

// rule sets sourced from the plugin's own configs so new rules arrive on dep bumps
const mergeConfigRules = (configs: { rules?: FlatConfig['rules'] }[] | undefined): NonNullable<FlatConfig['rules']> =>
  Object.assign({}, ...(configs ?? []).map((config) => config.rules ?? {})) as NonNullable<FlatConfig['rules']>;

const astroscopeRecommendedRules = mergeConfigRules((astroscopePlugin as PluginConfigs).configs?.recommended);
const i18nRecommendedRules = mergeConfigRules((astroscopePlugin as PluginConfigs).configs?.i18n);

export type AstroI18nOptions = {
  /** Attribute names added to the i18n no-raw-strings ignore list. */
  ignoreAttributes?: string[] | undefined;
};

export type AstroOptions = {
  /** Enable @astroscope/i18n rules. Pass an object to extend ignored attributes. */
  i18n?: boolean | AstroI18nOptions | undefined;

  /**
   * tsconfig path(s) for type-aware rules on `.astro`. Defaults to `projectService: true`
   * (via @entwico/astro-eslint-parser, which shares one tsserver project with .ts/.tsx).
   */
  tsconfigProject?: string | string[] | undefined;
};

/** Astro + @astroscope/eslint-plugin rules. */
export function astro(options: AstroOptions = {}): FlatConfigArray {
  const { i18n = false, tsconfigProject } = options;
  const i18nEnabled = i18n !== false;
  const i18nIgnoreAttributes = typeof i18n === 'object' ? (i18n.ignoreAttributes ?? []) : [];
  const astroParserOptions =
    tsconfigProject === undefined ? { projectService: true } : { project: tsconfigProject };

  const configs: FlatConfigArray = [
    ...eslintPluginAstro.configs.recommended.map((config) => {
      const languageOptions = config.languageOptions ?? {};
      const parser =
        typeof languageOptions === 'object' && 'parser' in languageOptions
          ? (languageOptions.parser as { meta?: { name?: string } } | undefined)
          : undefined;

      // only the astro-parser block gets `project`; the virtual-script block (`astro/base/typescript`)
      // deliberately sets `project: null`, and on .ts/.tsx it clashes with base's `projectService`
      if (parser?.meta?.name !== 'astro-eslint-parser') {
        return config;
      }

      const parserOptions =
        'parserOptions' in languageOptions ? (languageOptions.parserOptions as Record<string, unknown>) : {};

      return {
        ...config,
        languageOptions: {
          ...languageOptions,
          // the fork adds `projectService` support on top of the original parser
          parser: astroEslintParser,
          parserOptions: {
            ...parserOptions,
            parser: tsParser,
            // without a project, .astro has no type info and type-aware rules silently no-op
            ...astroParserOptions,
          },
        },
      };
    }),

    ...eslintPluginAstro.configs['jsx-a11y-strict'],

    {
      files: JS_TS_FILES,
      plugins: { '@astroscope': astroscopePlugin as never },
      rules: astroscopeRecommendedRules,
    },

    {
      // in .astro, a bare top-level `return` in frontmatter is the `Astro.rewrite`/early-`Response`
      // idiom; `unicorn/prefer-module` misfires on it. disable for .astro only; keep it on .ts/.js.
      files: ['**/*.astro'],
      rules: {
        'unicorn/prefer-module': 'off',
      },
    },
  ];

  if (i18nEnabled) {
    configs.push({
      files: JS_TS_FILES,
      plugins: { '@astroscope/i18n': i18nPlugin as never },
      rules: {
        ...i18nRecommendedRules,
        // recommended ships these as `warn`; a warning nobody fails on is a rule nobody obeys
        '@astroscope/i18n/t-static-meta': 'error',
        '@astroscope/i18n/t-requires-meta': 'error',
        '@astroscope/i18n/no-raw-strings-in-jsx': [
          'error',
          { ignoreAttributes: [...DEFAULT_IGNORE_ATTRIBUTES, ...i18nIgnoreAttributes] },
        ],
      },
    });
  }

  return configs;
}
