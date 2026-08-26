import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEFAULT_IGNORES } from './files.js';
import { astro } from './presets/astro.js';
import { base } from './presets/base.js';
import { type CssOptions, css } from './presets/css.js';
import { type ImportsOptions, imports } from './presets/imports.js';
import { react } from './presets/react.js';
import { stylistic } from './presets/stylistic.js';
import { type TailwindOptions, tailwind } from './presets/tailwind.js';
import type { FlatConfigArray } from './types.js';
import { promoteWarnings } from './utils/promote-warnings.js';

export type DefineConfigOptions = {
  /** Pass `import.meta.dirname` from your eslint.config.js. */
  root: string;

  /** Enable React rules. Auto-detects `vite` for react-refresh. */
  react?:
    | boolean
    | {
      customEffectHooks?: string | undefined;
      reactRefresh?: boolean | undefined;
    }
    | undefined;

  /** Enable Astro rules. Auto-detects `@astroscope/i18n` and `@astroscope/wormhole` for their rule sets. */
  astro?: boolean | { i18n?: boolean | { ignoreAttributes?: string[] }; wormhole?: boolean } | undefined;

  /** Enable Tailwind rules. */
  tailwind?: TailwindOptions | undefined;

  /**
   * Lint `.css` files via \@eslint/css. Defaults to on when `tailwind` is
   * configured — which is the only case where we know the project has
   * stylesheets — and off otherwise, so a server pays nothing for the language.
   * Set it explicitly either way.
   */
  css?: boolean | CssOptions | undefined;

  /** Import ordering and the re-export ban. Always on; this only tunes it. */
  imports?: ImportsOptions | undefined;

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

/**
 * Compose the flat config for an Entwico project.
 *
 * Returns a promise — ESLint awaits a config file's default export, so
 * `export default defineConfig({ … })` needs no change at the call site.
 */
export async function defineConfig(options: DefineConfigOptions): Promise<FlatConfigArray> {
  const {
    root,
    react: enableReact = false,
    astro: enableAstro = false,
    tailwind: tailwindOptions,
    css: enableCss = tailwindOptions !== undefined,
    imports: importsOptions,
    tsconfigProject,
    ignores,
    extra = [],
    extraPromoteWarnings = true,
  } = options;

  const deps = readPackageDeps(root);
  const astroOpts = typeof enableAstro === 'object' ? enableAstro : {};
  const reactOpts = typeof enableReact === 'object' ? enableReact : {};

  const cssOpts = typeof enableCss === 'object' ? enableCss : {};

  const [astroBlocks, reactBlocks, tailwindBlocks, cssBlocks] = await Promise.all([
    enableAstro
      ? astro({
          i18n: deps.has('@astroscope/i18n'),
          wormhole: deps.has('@astroscope/wormhole'),
          ...(tsconfigProject !== undefined && { tsconfigProject }),
          ...astroOpts,
        })
      : [],

    enableReact
      ? react({
          reactRefresh: reactOpts.reactRefresh ?? deps.has('vite'),
          ...(reactOpts.customEffectHooks !== undefined && { customEffectHooks: reactOpts.customEffectHooks }),
        })
      : [],

    tailwindOptions ? tailwind(tailwindOptions) : [],

    enableCss
      ? css({
          root,
          ...cssOpts,
          // the css preset needs them to parse `@theme`/`@apply` at all
          ...(tailwindOptions && !cssOpts.tailwind && { tailwind: tailwindOptions }),
        })
      : [],
  ]);

  return [
    ...promoteWarnings([
      { ignores: [...DEFAULT_IGNORES, ...(ignores ?? [])] },
      { linterOptions: { reportUnusedDisableDirectives: 'error' } },

      ...base({ root, ...(tsconfigProject !== undefined && { tsconfigProject }) }),

      ...astroBlocks,
      ...reactBlocks,
      ...tailwindBlocks,
      ...cssBlocks,

      ...imports(importsOptions),
      ...stylistic(),
    ]),

    ...(extraPromoteWarnings ? promoteWarnings(extra) : extra),
  ];
}
