import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEFAULT_IGNORES } from './files.js';
import { astro } from './presets/astro.js';
import { base } from './presets/base.js';
import { imports } from './presets/imports.js';
import { react } from './presets/react.js';
import { stylistic } from './presets/stylistic.js';
import { tailwind } from './presets/tailwind.js';
import type { FlatConfigArray } from './types.js';
import { promoteWarnings } from './utils/promote-warnings.js';

export type DefineConfigOptions = {
  /** Pass `import.meta.dirname` from your eslint.config.js. */
  root: string;

  /** Enable React rules. Auto-detects `vite` for react-refresh and `babel-plugin-react-compiler` for compiler lints. */
  react?:
    | boolean
    | {
      customEffectHooks?: string | undefined;
      reactRefresh?: boolean | undefined;
      reactCompiler?: boolean | undefined;
    }
    | undefined;

  /** Enable Astro rules. Auto-detects `@astroscope/i18n` for i18n rules. */
  astro?: boolean | { i18n?: boolean | { ignoreAttributes?: string[] } } | undefined;

  /** Enable Tailwind rules. */
  tailwind?: { entryPoint: string; ignoreClasses?: string[] } | undefined;

  /** Pin specific tsconfig paths. Defaults to `projectService: true`. */
  tsconfigProject?: string | string[] | undefined;

  /** Additional global ignore patterns, merged with the package defaults. */
  ignores?: string[] | undefined;

  /** Extra flat-config blocks appended last. */
  extra?: FlatConfigArray | undefined;

  /**
   * Apply the same `warn` → `error` promotion to your `extra` blocks.
   * Set to `false` to keep consumer-chosen severities verbatim.
   * @default true
   */
  extraPromoteWarnings?: boolean | undefined;
};

function readPackageDeps(root: string): Set<string> {
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    return new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ]);
  } catch {
    return new Set();
  }
}

/** Compose the flat config for an Entwico project. */
export function defineConfig(options: DefineConfigOptions): FlatConfigArray {
  const {
    root,
    react: enableReact = false,
    astro: enableAstro = false,
    tailwind: tailwindOptions,
    tsconfigProject,
    ignores,
    extra = [],
    extraPromoteWarnings = true,
  } = options;

  const deps = readPackageDeps(root);
  const astroOpts = typeof enableAstro === 'object' ? enableAstro : {};
  const reactOpts = typeof enableReact === 'object' ? enableReact : {};

  return [
    ...promoteWarnings([
      { ignores: [...DEFAULT_IGNORES, ...(ignores ?? [])] },
      { linterOptions: { reportUnusedDisableDirectives: 'error' } },

      ...base({ root, ...(tsconfigProject === undefined ? {} : { tsconfigProject }) }),

      ...(enableAstro ? astro({ i18n: deps.has('@astroscope/i18n'), ...astroOpts }) : []),

      ...(enableReact
        ? react({
            reactRefresh: reactOpts.reactRefresh ?? deps.has('vite'),
            reactCompiler: reactOpts.reactCompiler ?? deps.has('babel-plugin-react-compiler'),
            ...(reactOpts.customEffectHooks === undefined ? {} : { customEffectHooks: reactOpts.customEffectHooks }),
          })
        : []),

      ...(tailwindOptions ? tailwind(tailwindOptions) : []),

      ...imports(),
      ...stylistic(),
    ]),

    ...(extraPromoteWarnings ? promoteWarnings(extra) : extra),
  ];
}
