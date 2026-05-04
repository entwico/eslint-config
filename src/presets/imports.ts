import importPlugin from 'eslint-plugin-import-x';

import { JS_TS_FILES } from '../files.js';
import type { FlatConfigArray } from '../types.js';

export type ImportsOptions = {
  /**
   * Path alias prefixes that should be treated as the `internal` group,
   * placed between `external` and `parent`.
   * @default ['@/**']
   */
  internalPatterns?: string[] | undefined;
};

/**
 * Import ordering and duplicate detection rules.
 * Uses eslint-plugin-import-x for better ESLint 9 support.
 *
 * Enforces:
 * - groups: builtin → external → internal (`@/...`) → parent → sibling → index
 * - alphabetic ordering within each group
 * - no-extraneous-dependencies: catches imports from undeclared packages
 *   (pnpm's strict node_modules layout makes these fail at runtime)
 *
 * Blank lines between groups are NOT enforced — consumers manage them manually.
 * (import-x has no per-pair newlines-between option; enforcing one specific blank
 * would cost either subgroup ordering or alphabetic sort.)
 */
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
            pathGroups: internalPatterns.map(pattern => ({
              pattern,
              group: 'internal' as const,
              position: 'before' as const,
            })),
            // default pathGroupsExcludedImportTypes is ['builtin', 'external', 'object'] —
            // we drop 'external' so '@/...' imports (which look external to the resolver)
            // are matched against pathGroups and routed to 'internal'.
            pathGroupsExcludedImportTypes: ['builtin', 'object'],
            alphabetize: { order: 'asc' },
          },
        ],
      },
    },
  ];
}
