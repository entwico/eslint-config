import astroscopePlugin from '@astroscope/eslint-plugin';
import i18nPlugin, { DEFAULT_IGNORE_ATTRIBUTES } from '@astroscope/eslint-plugin-i18n';
import tsParser from '@typescript-eslint/parser';
import eslintPluginAstro from 'eslint-plugin-astro';

import { JS_TS_FILES } from '../files.js';
import type { FlatConfig, FlatConfigArray } from '../types.js';

// rule set sourced from the plugin's `recommended` config so new rules arrive on dep bumps
const astroscopeRecommendedRules = Object.assign(
  {},
  ...((astroscopePlugin as { configs?: { recommended?: { rules?: FlatConfig['rules'] }[] } }).configs?.recommended ??
    []).map((config) => config.rules ?? {}),
) as NonNullable<FlatConfig['rules']>;

// same sourcing for i18n; its `recommended` is a single flat-config object rather than an array
const i18nRecommendedRules = ((i18nPlugin as { configs?: { recommended?: { rules?: FlatConfig['rules'] } } }).configs
  ?.recommended?.rules ?? {}) as NonNullable<FlatConfig['rules']>;

export type AstroI18nOptions = {
  /** Attribute names added to the i18n no-raw-strings ignore list. */
  ignoreAttributes?: string[] | undefined;
};

export type AstroOptions = {
  /** Enable @astroscope/i18n rules. Pass an object to extend ignored attributes. */
  i18n?: boolean | AstroI18nOptions | undefined;

  /**
   * tsconfig path(s) for type-aware rules on `.astro`. Defaults to `true` (auto-discovery).
   * astro-eslint-parser supports `project`, not `projectService`.
   */
  tsconfigProject?: string | string[] | undefined;
};

/** Astro + @astroscope/eslint-plugin rules. */
export function astro(options: AstroOptions = {}): FlatConfigArray {
  const { i18n = false, tsconfigProject } = options;
  const i18nEnabled = i18n !== false;
  const i18nIgnoreAttributes = typeof i18n === 'object' ? (i18n.ignoreAttributes ?? []) : [];
  const astroProject = tsconfigProject ?? true;

  const configs: FlatConfigArray = [
    ...eslintPluginAstro.configs.recommended.map((config) => {
      const languageOptions = config.languageOptions ?? {};

      // only the astro-parser block gets `project`; on .ts/.tsx it clashes with base's `projectService`
      if (typeof languageOptions !== 'object' || !('parser' in languageOptions) || !languageOptions.parser) {
        return config;
      }

      const parserOptions =
        'parserOptions' in languageOptions ? (languageOptions.parserOptions as Record<string, unknown>) : {};

      return {
        ...config,
        languageOptions: {
          ...languageOptions,
          parserOptions: {
            ...parserOptions,
            parser: tsParser,
            // without `project`, .astro has no type info and type-aware rules silently no-op
            project: astroProject,
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
