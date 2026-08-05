import importPlugin from 'eslint-plugin-import-x';

import { JS_TS_FILES } from '../files.js';
import { entwicoPlugin } from '../plugin.js';
import type { FlatConfigArray } from '../types.js';

export type NoReexportOptions = {
  /** Files allowed to re-export — a library's public entry point, and nothing else. */
  allow?: string[] | undefined;

  /** Leave `export type { X } from './x'` alone. */
  allowTypes?: boolean | undefined;
};

export type ImportsOptions = {
  /** Glob patterns matched as the `internal` group (between external and parent). */
  internalPatterns?: string[] | undefined;

  /**
   * Forbid re-exports (`export * from`, `export { x } from`, and their spelled-out form).
   * @default true
   */
  noReexport?: boolean | NoReexportOptions | undefined;
};

/** Import ordering, duplicate detection, no-extraneous-dependencies, no re-exports. */
export function imports(options: ImportsOptions = {}): FlatConfigArray {
  const { internalPatterns = ['@/**'], noReexport = true } = options;

  const reexportOptions = typeof noReexport === 'object' ? noReexport : {};
  const { allow, ...ruleOptions } = reexportOptions;

  return [
    {
      files: JS_TS_FILES,
      ...importPlugin.flatConfigs.recommended,
      plugins: {
        ...importPlugin.flatConfigs.recommended.plugins,
        '@entwico': entwicoPlugin,
      },
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
        '@entwico/no-reexport': noReexport ? ['error', ruleOptions] : 'off',
        // it rewrites `import { a }; export { a }` into the very form we ban — and auto-fixes it
        ...(noReexport && { 'unicorn/prefer-export-from': 'off' as const }),
      },
    },

    ...(noReexport && allow?.length
      ? [{ files: allow, rules: { '@entwico/no-reexport': 'off' as const } }]
      : []),
  ];
}
