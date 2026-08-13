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

/**
 * JSON / JSONC / JSON5 linting via \@eslint/json.
 *
 * Async so the JSON plugin is only loaded by projects that compose it in.
 */
export async function json(options: JsonOptions = {}): Promise<FlatConfigArray> {
  const jsoncFiles = [...COMMON_JSONC_FILES, ...(options.jsoncFiles ?? [])];

  const { default: jsonPlugin } = await import('@eslint/json');

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
