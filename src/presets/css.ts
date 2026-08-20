import type { Linter } from 'eslint';

import type { FlatConfigArray } from '../types.js';
import { type TailwindOptions, tailwindCssContribution } from './tailwind.js';

export type CssOptions = {
  /** File patterns linted as CSS. @default ['**\/*.css'] */
  files?: string[] | undefined;

  /**
   * Tailwind options, when the project has them. Swaps in a Tailwind-aware
   * csstree syntax and lints the classes inside `@apply`.
   */
  tailwind?: TailwindOptions | undefined;
};

/**
 * CSS linting via \@eslint/css.
 *
 * Async so the CSS language is only loaded by projects that enable it — it
 * costs ~47ms, which a project without stylesheets should not pay.
 */
export async function css(options: CssOptions = {}): Promise<FlatConfigArray> {
  const { files = ['**/*.css'], tailwind: tailwindOptions } = options;

  const { default: cssPlugin } = await import('@eslint/css');
  const tailwindBits = tailwindOptions ? await tailwindCssContribution(tailwindOptions) : undefined;

  return [
    {
      files,
      language: 'css/css',
      languageOptions: {
        // the stock syntax rejects `@theme`, `@utility`, `@apply`, `@source`, …
        ...(tailwindBits && { customSyntax: tailwindBits.syntax }),
        tolerant: true,
      },
      plugins: {
        css: cssPlugin as never,
        ...tailwindBits?.plugins,
      },
      ...(tailwindBits && { settings: tailwindBits.settings }),
      rules: {
        ...(cssPlugin.configs.recommended.rules as Linter.RulesRecord),

        // --radix-accordion-content-height etc are unknown
        'css/no-invalid-properties': ['error', { allowUnknownVariables: true }],

        // the rule is blind fire-and-forget and cannot see -webkit- fallbacks
        // that fix the problems
        'css/use-baseline': 'off',

        ...tailwindBits?.rules,
      },
    },
  ];
}
