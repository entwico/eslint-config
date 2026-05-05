import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import globals from 'globals';

import type { FlatConfigArray } from '../types.js';

export type ReactOptions = {
  /** File patterns to apply React rules to. */
  files?: string[] | undefined;

  /** Custom effect-like hooks (regex alternation), forwarded to react-hooks/exhaustive-deps. */
  customEffectHooks?: string | undefined;

  /** Enable react-refresh rules (typically for Vite/HMR projects). */
  reactRefresh?: boolean | undefined;

  /** Enable jsx-a11y strict mode. */
  a11yStrict?: boolean | undefined;

  /** Project uses React Compiler — turn on the compiler-specific lints from eslint-plugin-react-hooks v7. */
  reactCompiler?: boolean | undefined;
};

/** React, react-hooks, jsx-a11y rules. */
export function react(options: ReactOptions = {}): FlatConfigArray {
  const {
    files = ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    customEffectHooks,
    reactRefresh = false,
    a11yStrict = true,
    reactCompiler = false,
  } = options;

  const configs: FlatConfigArray = [
    {
      plugins: {
        react: reactPlugin,
        'jsx-a11y': jsxA11y,
        'react-hooks': reactHooksPlugin as never,
      },
      settings: {
        react: { version: 'detect' },
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
      rules: {
        ...reactPlugin.configs.recommended.rules,
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'react/self-closing-comp': ['error', { component: true, html: true }],
      },
    },

    {
      files,
      rules: {
        ...(a11yStrict ? jsxA11y.flatConfigs.strict.rules : jsxA11y.flatConfigs.recommended.rules),
      },
    },

    {
      files,
      rules: {
        ...reactHooksPlugin.configs.recommended.rules,
        'react-hooks/exhaustive-deps': ['error', customEffectHooks ? { additionalHooks: customEffectHooks } : {}],
        ...(reactCompiler
          ? {}
          : {
              'react-hooks/set-state-in-effect': 'off',
              'react-hooks/refs': 'off',
              'react-hooks/incompatible-library': 'off',
              'react-hooks/unsupported-syntax': 'off',
            }),
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
