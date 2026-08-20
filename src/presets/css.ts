import type { Linter } from 'eslint';

import { entwicoPlugin } from '../plugin.js';
import type { FlatConfigArray } from '../types.js';
import { type TailwindOptions, tailwindCssContribution } from './tailwind.js';

export type CssOptions = {
  /** File patterns linted as CSS. @default ['**\/*.css'] */
  files?: string[] | undefined;

  /**
   * Project root the tailwind `entryPoint` is relative to; `defineConfig`
   * forwards its own `root`. Lets the `tailwind-prefer-reference` autofix
   * compute the relative `@reference` path. @default process.cwd()
   */
  root?: string | undefined;

  /**
   * Tailwind options, when the project has them. Swaps in a Tailwind-aware
   * csstree syntax and lints the classes inside `@apply`.
   */
  tailwind?: TailwindOptions | undefined;

};

type CssRuleModule = {
  create: (context: { sourceCode: { getText: (node: unknown) => string } }) => Record<string, (node: never) => void>;
};

/**
 * css-tree refuses to match an at-rule prelude containing `var()`/`env()`
 * with a generic Error whose message `no-invalid-at-rules` cannot parse — a
 * TypeError crash on e.g. `@apply [color:var(--x)]`. Such preludes are
 * unmatchable anyway, skipping.
 */
function patchNoInvalidAtRules(rule: CssRuleModule): CssRuleModule {
  return {
    ...rule,
    create(context) {
      const visitors = rule.create(context);
      const visitAtrule = visitors.Atrule;

      return {
        ...visitors,
        ...(visitAtrule && {
          Atrule: (node: { prelude?: unknown }) => {
            if (node.prelude && /\b(?:var|env)\(/.test(context.sourceCode.getText(node.prelude))) {
              return;
            }

            visitAtrule(node as never);
          },
        }),
      };
    },
  };
}

/**
 * CSS linting via \@eslint/css.
 *
 * Async so the CSS language is only loaded by projects that enable it — it
 * costs ~47ms, which a project without stylesheets should not pay.
 */
export async function css(options: CssOptions = {}): Promise<FlatConfigArray> {
  const { files = ['**/*.css'], root, tailwind: tailwindOptions } = options;

  const { default: cssPlugin } = await import('@eslint/css');
  const tailwindBits = tailwindOptions ? await tailwindCssContribution(tailwindOptions) : undefined;
  const preferApply = tailwindOptions?.preferApply ?? true;
  const preferApplyOptions = typeof preferApply === 'object' ? preferApply : {};

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
        css: {
          ...cssPlugin,
          rules: {
            ...cssPlugin.rules,
            'no-invalid-at-rules': patchNoInvalidAtRules(cssPlugin.rules['no-invalid-at-rules'] as never),
          },
        } as never,
        ...tailwindBits?.plugins,
        ...(tailwindBits && { '@entwico': entwicoPlugin }),
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

        ...(tailwindOptions && tailwindBits && {
          '@entwico/tailwind-prefer-apply': preferApply ? ['error', preferApplyOptions] as Linter.RuleEntry : 'off',
          '@entwico/tailwind-prefer-reference': [
            'error',
            { entryPoint: tailwindOptions.entryPoint, ...(root && { root }) },
          ] as Linter.RuleEntry,
          '@entwico/tailwind-apply-once': 'error' as const,
        }),
      },
    },
  ];
}
