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

/**
 * \@eslint-react + jsx-a11y rules.
 *
 * Async so the React plugin graph is only loaded by projects that enable it.
 */
export async function react(options: ReactOptions = {}): Promise<FlatConfigArray> {
  const {
    files = ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    customEffectHooks,
    reactRefresh = false,
    a11yStrict = true,
  } = options;

  const [{ default: eslintReact }, { default: jsxA11y }, { default: globals }] = await Promise.all([
    import('@eslint-react/eslint-plugin'),
    import('eslint-plugin-jsx-a11y'),
    import('globals'),
  ]);

  // astro's virtual `<name>.astro/<n>.ts` script files have no type service — type-aware rules
  // throw on them, so exclude them (mirrors base's TYPE_AWARE_IGNORES).
  const ASTRO_VIRTUAL_FILES = '**/*.astro/**';

  // eslint-react presets ship as flat-config object(s); normalize to an array and scope to our files.
  const scopeToFiles = (preset: FlatConfig | FlatConfig[]): FlatConfig[] =>
    [preset].flat().map((config) => ({
      ...config,
      files,
      ignores: [...(config.ignores ?? []), ASTRO_VIRTUAL_FILES],
    }));

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
        ...(reactRefresh && { globals: globals.browser }),
      },
    },

    // react + hooks, type-aware; relies on base's projectService wiring for .ts/.tsx
    ...scopeToFiles(eslintReact.configs['recommended-type-checked']),

    {
      files,
      ignores: [ASTRO_VIRTUAL_FILES],
      rules: customEffectHooks
        ? { '@eslint-react/exhaustive-deps': ['warn', { additionalHooks: customEffectHooks }] }
        : {},
    },

    {
      files,
      rules: {
        ...jsxA11y.flatConfigs[a11yStrict ? 'strict' : 'recommended'].rules,
      },
    },
  ];

  if (reactRefresh) {
    const { default: reactRefreshPlugin } = await import('eslint-plugin-react-refresh');

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
