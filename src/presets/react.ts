import eslintReact from '@eslint-react/eslint-plugin';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import globals from 'globals';

import type { FlatConfig, FlatConfigArray } from '../types.js';

export type ReactOptions = {
  /** File patterns to apply React rules to. */
  files?: string[] | undefined;

  /** Custom effect-like hooks (regex alternation), forwarded to @eslint-react/exhaustive-deps. */
  customEffectHooks?: string | undefined;

  /** Enable react-refresh rules (typically for Vite/HMR projects). */
  reactRefresh?: boolean | undefined;

  /** Enable jsx-a11y strict mode. */
  a11yStrict?: boolean | undefined;
};

/** @eslint-react + jsx-a11y rules. */
export function react(options: ReactOptions = {}): FlatConfigArray {
  const {
    files = ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    customEffectHooks,
    reactRefresh = false,
    a11yStrict = true,
  } = options;

  // eslint-react presets ship as flat-config object(s); normalize to an array and scope to our files.
  const scopeToFiles = (preset: FlatConfig | FlatConfig[]): FlatConfig[] =>
    [preset].flat().map((config) => ({ ...config, files }));

  const configs: FlatConfigArray = [
    {
      plugins: {
        'jsx-a11y': jsxA11y,
      },
    },

    {
      files,
      languageOptions: {
        parserOptions: {
          ecmaFeatures: { jsx: true },
        },
        ...(reactRefresh ? { globals: globals.browser } : {}),
      },
    },

    // react + hooks, type-aware; relies on base's projectService wiring for .ts/.tsx
    ...scopeToFiles(eslintReact.configs['recommended-type-checked']),

    {
      files,
      rules: customEffectHooks
        ? { '@eslint-react/exhaustive-deps': ['warn', { additionalHooks: customEffectHooks }] }
        : {},
    },

    {
      files,
      rules: {
        ...(a11yStrict ? jsxA11y.flatConfigs.strict.rules : jsxA11y.flatConfigs.recommended.rules),
      },
    },
  ];

  if (reactRefresh) {
    configs.push(
      {
        plugins: {
          'react-refresh': reactRefreshPlugin,
        },
      },
      {
        files,
        rules: {
          'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        },
      },
    );
  }

  return configs;
}
