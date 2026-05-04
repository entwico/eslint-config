import jsonPlugin from '@eslint/json';

import type { FlatConfigArray } from '../types.js';

const COMMON_JSONC_FILES = [
  '**/tsconfig.json',
  '**/tsconfig.*.json',
  '**/jsconfig.json',
  '**/.vscode/*.json',
  '**/devcontainer.json',
  '**/.devcontainer/**/*.json',
];

export type JsonOptions = {
  /**
   * Additional file patterns to treat as JSONC (JSON with comments + trailing commas)
   * instead of strict JSON. Common JSONC files (tsconfig.json, .vscode/*.json, etc.)
   * are auto-detected.
   */
  jsoncFiles?: string[] | undefined;
};

/**
 * JSON / JSONC / JSON5 linting via @eslint/json.
 *
 * Rules: no-duplicate-keys, no-empty-keys, no-unnormalized-keys,
 *        no-unsafe-values, top-level-interop.
 */
export function json(options: JsonOptions = {}): FlatConfigArray {
  const jsoncFiles = [...COMMON_JSONC_FILES, ...(options.jsoncFiles ?? [])];

  return [
    {
      files: ['**/*.json'],
      ignores: jsoncFiles,
      plugins: { json: jsonPlugin as never },
      language: 'json/json',
      rules: jsonPlugin.configs.recommended.rules,
    },
    {
      files: ['**/*.jsonc', ...jsoncFiles],
      plugins: { json: jsonPlugin as never },
      language: 'json/jsonc',
      rules: jsonPlugin.configs.recommended.rules,
    },
    {
      files: ['**/*.json5'],
      plugins: { json: jsonPlugin as never },
      language: 'json/json5',
      rules: jsonPlugin.configs.recommended.rules,
    },
  ];
}
