import type { Linter } from 'eslint';
import type { tailwind4 } from 'tailwind-csstree';

import { JS_TS_FILES } from '../files.js';
import { entwicoPlugin } from '../plugin.js';
import type { FlatConfigArray } from '../types.js';

export type TailwindClassMatcher = {
  match: 'strings' | 'objectKeys' | 'objectValues';
  pathPattern?: string | undefined;
};

/** A bare name matches string args only; use `['cn', [{ match: 'objectKeys' }]]` to also lint object keys. */
export type TailwindCallee = string | [string, TailwindClassMatcher[]];

export type TailwindOptions = {
  /** Path to the Tailwind CSS entry file. */
  entryPoint: string;

  /** Custom callees only; built-ins (cn/cva/clsx/…) already cover string args + object keys/values. */
  callees?: TailwindCallee[] | undefined;

  /** Root font size for rem calculations. */
  rootFontSize?: number | undefined;

  /** Attribute patterns to check for class strings. */
  attributes?: string[] | undefined;

  /** Class names to ignore in the unknown-class check. */
  ignoreClasses?: string[] | undefined;

  /**
   * Forbid static inline `style` values, which belong in classes once Tailwind is around.
   * Dynamic values and CSS custom properties are always allowed.
   * @default true
   */
  noInlineStyle?: boolean | { allowProperties?: string[] | undefined } | undefined;

  /**
   * Forbid `<style>` blocks. Blunt on purpose — disable it on the block
   * (`eslint-disable-next-line`) for keyframes, media queries and global resets.
   * @default true
   */
  noStyleTag?: boolean | undefined;

  /** Tailwind major the CSS custom syntax is taken from. @default 4 */
  version?: 3 | 4 | undefined;
};

/**
 * Tailwind CSS linting via eslint-plugin-better-tailwindcss.
 *
 * Async so the Tailwind plugin is only loaded by projects that enable it.
 */
export async function tailwind(options: TailwindOptions): Promise<FlatConfigArray> {
  const { noInlineStyle = true, noStyleTag = true } = options;

  const { plugins, settings, rules } = await tailwindCssContribution(options);
  const inlineStyleOptions = typeof noInlineStyle === 'object' ? noInlineStyle : {};

  return [
    {
      files: JS_TS_FILES,
      plugins: {
        ...plugins,
        '@entwico': entwicoPlugin,
      },
      settings,
      rules: {
        ...rules,
        '@entwico/no-inline-style': noInlineStyle ? ['error', inlineStyleOptions] : 'off',
        '@entwico/no-style-tag': noStyleTag ? 'error' : 'off',
      },
    },
  ];
}

type CsstreeSyntaxExtension = typeof tailwind4;

/**
 * The stock `@apply` prelude grammar rejects real classes (`text-[52px]/[1.05]`,
 * `text-(--brand)`); better-tailwindcss already validates them on the same node,
 * so accept any prelude.
 */
function relaxApplyPrelude(base: CsstreeSyntaxExtension): CsstreeSyntaxExtension {
  return (prev) => {
    const config = base(prev);

    return {
      ...config,
      atrules: {
        ...config.atrules,
        apply: { prelude: '<any-value>' },
      },
    };
  };
}

/**
 * The parts of the Tailwind setup that are language-agnostic, so the `css`
 * preset can layer them onto its own block: `@apply` is the one place outside
 * markup where Tailwind classes live, and better-tailwindcss reads them from an
 * `Atrule` node with the same rules and settings it uses on markup.
 */
export async function tailwindCssContribution(options: TailwindOptions): Promise<{
  plugins: Record<string, unknown>;
  settings: Record<string, unknown>;
  rules: Linter.RulesRecord;
  syntax: unknown;
}> {
  const {
    entryPoint,
    callees,
    rootFontSize = 16,
    attributes = ['class', 'className', 'ngClass', 'class:list', '[A-Za-z]+ClassName'],
    ignoreClasses,
    version = 4,
  } = options;

  const [{ default: tailwindPlugin }, { tailwind3, tailwind4 }] = await Promise.all([
    import('eslint-plugin-better-tailwindcss'),
    import('tailwind-csstree'),
  ]);

  const recommendedConfig = tailwindPlugin.configs.recommended as Record<string, unknown>;

  return {
    plugins: recommendedConfig.plugins as Record<string, unknown>,

    settings: {
      'better-tailwindcss': {
        entryPoint,
        rootFontSize,
        attributes,
        // omit by default so the plugin keeps its built-in selectors
        ...(callees && { callees }),
      },
    },

    rules: {
      ...(recommendedConfig.rules as Linter.RulesRecord),
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
      'better-tailwindcss/enforce-shorthand-classes': 'off',
      'better-tailwindcss/enforce-consistent-important-position': 'off',
      'better-tailwindcss/enforce-consistent-variable-syntax': 'off',
      ...(ignoreClasses && {
        'better-tailwindcss/no-unknown-classes': ['error', { ignore: ignoreClasses }],
      }),
    },

    syntax: relaxApplyPrelude(version === 3 ? tailwind3 : tailwind4),
  };
}
