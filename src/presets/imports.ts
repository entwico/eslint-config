import importPlugin from 'eslint-plugin-import-x';

import { JS_TS_FILES } from '../files.js';
import type { FlatConfigArray } from '../types.js';

export type ImportsOptions = {
  /** Glob patterns matched as the `internal` group (between external and parent). */
  internalPatterns?: string[] | undefined;
};

/** Import ordering, duplicate detection, no-extraneous-dependencies. */
export function imports(options: ImportsOptions = {}): FlatConfigArray {
  const { internalPatterns = ['@/**'] } = options;

  return [
    {
      files: JS_TS_FILES,
      ...importPlugin.flatConfigs.recommended,
      rules: {
        'import-x/no-duplicates': ['error', { 'prefer-inline': true }],
        'import-x/no-extraneous-dependencies': 'error',
        'import-x/order': [
          'error',
          {
            groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
            pathGroups: internalPatterns.map((pattern) => ({
              pattern,
              group: 'internal' as const,
              position: 'before' as const,
            })),
            pathGroupsExcludedImportTypes: ['builtin', 'object'],
            alphabetize: { order: 'asc' },
          },
        ],
      },
    },
  ];
}
