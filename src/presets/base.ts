import js from '@eslint/js';
import tseslint from 'typescript-eslint';

import { JS_TS_FILES } from '../files.js';
import type { FlatConfigArray } from '../types.js';

const TYPE_AWARE_FILES = ['**/*.{ts,tsx}'];
const TYPE_AWARE_IGNORES = ['**/*.astro/**'];

export type BaseOptions = {
  /**
   * Path to the consumer's package root. Pass `import.meta.dirname` from
   * your eslint.config.js. Used for tsconfigRootDir and type-aware project lookup.
   */
  root: string;
};

/**
 * Base ESLint configuration with JS and TypeScript rules
 */
export function base({ root }: BaseOptions): FlatConfigArray {
  return [
    {
      files: JS_TS_FILES,
      languageOptions: {
        parserOptions: { tsconfigRootDir: root },
      },
    },

    // standard js rules
    { files: JS_TS_FILES, ...js.configs.recommended },

    // override js rules (semantic only — formatting lives in the stylistic preset)
    {
      files: JS_TS_FILES,
      rules: {
        'eqeqeq': ['error', 'always'],
        'object-shorthand': 'error',
        'no-useless-concat': 'error',
        'prefer-template': 'error',
        'sort-imports': [
          'error',
          {
            ignoreCase: false,
            ignoreDeclarationSort: true, // let import/order handle declaration sorting
            ignoreMemberSort: false,
            memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
            allowSeparatedGroups: false,
          },
        ],
      },
    },

    // standard typescript rules
    ...tseslint.configs.recommended.map(c => ({ files: JS_TS_FILES, ...c })),

    // override typescript rules
    {
      files: JS_TS_FILES,
      rules: {
        '@typescript-eslint/consistent-type-imports': [
          'error',
          {
            prefer: 'type-imports',
            disallowTypeAnnotations: true,
            fixStyle: 'inline-type-imports',
          },
        ],
        '@typescript-eslint/no-import-type-side-effects': 'error',
        '@typescript-eslint/explicit-function-return-type': 0,
        '@typescript-eslint/explicit-module-boundary-types': 0,
        '@typescript-eslint/no-empty-function': 0,
        '@typescript-eslint/no-unused-expressions': 0,
        '@typescript-eslint/no-empty-interface': 0,
        '@typescript-eslint/no-explicit-any': 0,
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            varsIgnorePattern: '^_',
            argsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
          },
        ],
      },
    },

    // type-aware rules (always on)
    {
      files: TYPE_AWARE_FILES,
      ignores: TYPE_AWARE_IGNORES,
      languageOptions: {
        parserOptions: {
          project: './tsconfig.json',
          tsconfigRootDir: root,
        },
      },
      rules: {
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/no-deprecated': 'error',
        '@typescript-eslint/require-await': 'error',
      },
    },
  ];
}
