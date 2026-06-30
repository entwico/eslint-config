import stylisticPlugin from '@stylistic/eslint-plugin';

import { JS_TS_FILES } from '../files.js';
import { spaceBeforeComment } from '../rules/space-before-comment.js';
import type { FlatConfigArray } from '../types.js';

const entwicoPlugin = {
  rules: { 'space-before-comment': spaceBeforeComment },
};

export type StylisticOptions = {
  /** Indentation size in spaces. */
  indent?: number | undefined;

  /** Quote style. */
  quotes?: 'single' | 'double' | undefined;

  /** Require semicolons. */
  semi?: boolean | undefined;

  /** Trailing comma policy. */
  commaDangle?: 'never' | 'always' | 'always-multiline' | 'only-multiline' | undefined;
};

/** Formatting rules. */
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
    arrowParens: true,
    quoteProps: 'as-needed',
  });

  return [
    { files: JS_TS_FILES, ...recommended },
    {
      files: JS_TS_FILES,
      plugins: { '@entwico': entwicoPlugin },
      rules: {
        '@entwico/space-before-comment': 'error',
        '@stylistic/operator-linebreak': [
          'error',
          'after',
          { overrides: { '?': 'before', ':': 'before', '|': 'before', '&': 'before' } },
        ],
        '@stylistic/jsx-one-expression-per-line': 'off',
        '@stylistic/jsx-self-closing-comp': ['error', { component: true, html: true }],
        '@stylistic/multiline-ternary': 'off',
        '@stylistic/max-len': [
          'error',
          {
            code: 120,
            tabWidth: 2,
            ignoreUrls: true,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
            ignoreRegExpLiterals: true,
          },
        ],
      },
    },
  ];
}
