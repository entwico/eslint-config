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
  /** Additional file patterns to lint as JSONC instead of strict JSON. */
  jsoncFiles?: string[] | undefined;
};

/** JSON / JSONC / JSON5 linting via @eslint/json. */
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
