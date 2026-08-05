import tailwindPlugin from 'eslint-plugin-better-tailwindcss';

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
};

/** Tailwind CSS linting via eslint-plugin-better-tailwindcss. */
export function tailwind(options: TailwindOptions): FlatConfigArray {
  const {
    entryPoint,
    callees,
    rootFontSize = 16,
    attributes = ['class', 'className', 'ngClass', 'class:list', '[A-Za-z]+ClassName'],
    ignoreClasses,
    noInlineStyle = true,
    noStyleTag = true,
  } = options;

  const recommendedConfig = tailwindPlugin.configs.recommended as Record<string, unknown>;
  const inlineStyleOptions = typeof noInlineStyle === 'object' ? noInlineStyle : {};

  return [
    {
      files: JS_TS_FILES,
      ...recommendedConfig,
      plugins: {
        ...(recommendedConfig.plugins as Record<string, unknown>),
        '@entwico': entwicoPlugin,
      },
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
        ...(recommendedConfig.rules as Record<string, unknown>),
        'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
        'better-tailwindcss/enforce-shorthand-classes': 'off',
        'better-tailwindcss/enforce-consistent-important-position': 'off',
        'better-tailwindcss/enforce-consistent-variable-syntax': 'off',
        ...(ignoreClasses && {
          'better-tailwindcss/no-unknown-classes': ['error', { ignore: ignoreClasses }],
        }),
        '@entwico/no-inline-style': noInlineStyle ? ['error', inlineStyleOptions] : 'off',
        '@entwico/no-style-tag': noStyleTag ? 'error' : 'off',
      },
    },
  ];
}
