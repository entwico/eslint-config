import js from '@eslint/js';
import tseslint from 'typescript-eslint';

import { JS_TS_FILES } from '../files.js';
import type { FlatConfigArray } from '../types.js';

const TYPE_AWARE_FILES = ['**/*.{ts,tsx}'];
const TYPE_AWARE_IGNORES = ['**/*.astro/**'];

export type BaseOptions = {
  /** Pass `import.meta.dirname` from your eslint.config.js. */
  root: string;

  /** Pin specific tsconfig paths. Defaults to `projectService: true`. */
  tsconfigProject?: string | string[] | undefined;
};

/** JS + TypeScript rules including type-aware checks. */
export function base({ root, tsconfigProject }: BaseOptions): FlatConfigArray {
  const typeAwareParserOptions =
    tsconfigProject !== undefined
      ? { project: tsconfigProject, tsconfigRootDir: root }
      : { projectService: true, tsconfigRootDir: root };

  return [
    {
      files: JS_TS_FILES,
      languageOptions: {
        parserOptions: { tsconfigRootDir: root },
      },
    },

    { files: JS_TS_FILES, ...js.configs.recommended },

    {
      files: JS_TS_FILES,
      rules: {
        eqeqeq: ['error', 'always'],
        'object-shorthand': 'error',
        'no-useless-concat': 'error',
        'prefer-template': 'error',
        'sort-imports': [
          'error',
          {
            ignoreCase: false,
            ignoreDeclarationSort: true,
            ignoreMemberSort: false,
            memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
            allowSeparatedGroups: false,
          },
        ],
      },
    },

    ...tseslint.configs.recommended.map((c) => ({ files: JS_TS_FILES, ...c })),

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

    {
      files: TYPE_AWARE_FILES,
      ignores: TYPE_AWARE_IGNORES,
      languageOptions: {
        parserOptions: typeAwareParserOptions,
      },
      rules: {
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/no-deprecated': 'error',
        '@typescript-eslint/require-await': 'error',
      },
    },
  ];
}
