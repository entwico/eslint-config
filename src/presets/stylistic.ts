import stylisticPlugin from '@stylistic/eslint-plugin';

import { JS_TS_FILES } from '../files.js';
import type { FlatConfigArray } from '../types.js';

export type StylisticOptions = {
  /**
   * Indentation size (spaces).
   * @default 2
   */
  indent?: number | undefined;

  /**
   * Quote style for strings.
   * @default 'single'
   */
  quotes?: 'single' | 'double' | undefined;

  /**
   * Whether to require semicolons.
   * @default true
   */
  semi?: boolean | undefined;

  /**
   * Trailing comma style.
   * @default 'always-multiline'
   */
  commaDangle?: 'never' | 'always' | 'always-multiline' | 'only-multiline' | undefined;
};

/**
 * Formatting rules powered by @stylistic/eslint-plugin.
 * Replaces Prettier for JS/TS/JSX/TSX/Astro.
 */
export function stylistic(options: StylisticOptions = {}): FlatConfigArray {
  const {
    indent = 2,
    quotes = 'single',
    semi = true,
    commaDangle = 'always-multiline',
  } = options;

  const recommended = stylisticPlugin.configs.customize({
    indent,
    quotes,
    semi,
    commaDangle,
    jsx: true,
    braceStyle: '1tbs',
    arrowParens: false,
  });

  return [
    { files: JS_TS_FILES, ...recommended },
    {
      files: JS_TS_FILES,
      rules: {
        // Prettier-compatible: '=' stays at end of line, ternary operators go to next line
        '@stylistic/operator-linebreak': [
          'error',
          'after',
          { overrides: { '?': 'before', ':': 'before' } },
        ],
        // jsx-one-expression-per-line is overly strict (Prettier doesn't enforce it)
        '@stylistic/jsx-one-expression-per-line': 'off',
      },
    },
    {
      files: ['**/*.astro'],
      rules: {
        // astro inline scripts use string concatenation
        'prefer-template': 'off',
      },
    },
  ];
}
