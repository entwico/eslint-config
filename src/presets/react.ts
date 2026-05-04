import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import globals from 'globals';

import type { FlatConfigArray } from '../types.js';

export type ReactOptions = {
  /**
   * File patterns to apply React rules to.
   * @default ['**\/*.{js,mjs,cjs,ts,jsx,tsx}']
   */
  files?: string[] | undefined;

  /**
   * Additional hooks for exhaustive-deps rule.
   * @example 'useEffectAfterMount|useEffectOnce'
   */
  additionalHooks?: string | undefined;

  /**
   * Enable react-refresh plugin for Vite projects.
   * @default false
   */
  vite?: boolean | undefined;

  /**
   * Enable jsx-a11y strict mode.
   * @default true
   */
  a11yStrict?: boolean | undefined;
};

/**
 * React, React Hooks, and JSX accessibility rules.
 */
export function react(options: ReactOptions = {}): FlatConfigArray {
  const { files = ['**/*.{js,mjs,cjs,ts,jsx,tsx}'], additionalHooks, vite = false, a11yStrict = true } = options;

  const configs: FlatConfigArray = [
    // react core rules
    {
      files,
      plugins: {
        'react': reactPlugin,
        'jsx-a11y': jsxA11y,
      },
      languageOptions: {
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
        },
        ...(vite ? { globals: globals.browser } : {}),
      },
      settings: {
        react: {
          version: 'detect',
        },
      },
      rules: {
        ...reactPlugin.configs.recommended.rules,
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'react/self-closing-comp': ['error', { component: true, html: true }],
      },
    },

    // jsx-a11y rules
    {
      files,
      rules: {
        ...(a11yStrict ? jsxA11y.flatConfigs.strict.rules : jsxA11y.flatConfigs.recommended.rules),
      },
    },

    // react hooks rules
    {
      plugins: {
        'react-hooks': reactHooksPlugin as never,
      },
      rules: {
        ...reactHooksPlugin.configs.recommended.rules,
        'react-hooks/exhaustive-deps': ['error', additionalHooks ? { additionalHooks } : {}],
        'react-hooks/set-state-in-effect': 'off',
        'react-hooks/refs': 'off',
        'react-hooks/incompatible-library': 'off',
        'react-hooks/unsupported-syntax': 'off',
      },
    },
  ];

  // react-refresh for Vite
  if (vite) {
    configs.push({
      files,
      plugins: {
        'react-refresh': reactRefreshPlugin,
      },
      rules: {
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      },
    });
  }

  return configs;
}
