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

export type DefineConfigOptions = {
  /** Pass `import.meta.dirname` from your eslint.config.js. */
  root: string;

  /** Enable React rules. Auto-detects `vite` for react-refresh. */
  react?: boolean | { customEffectHooks?: string } | undefined;

  /** Enable Astro rules. Auto-detects `@astroscope/i18n` for i18n rules. */
  astro?: boolean | { i18n?: boolean | { ignoreAttributes?: string[] } } | undefined;

  /** Enable Tailwind rules. */
  tailwind?: { entryPoint: string; ignoreClasses?: string[] } | undefined;

  /** Additional global ignore patterns, merged with the package defaults. */
  ignores?: string[] | undefined;

  /** Extra flat-config blocks appended last. */
  extra?: FlatConfigArray | undefined;
};

function readPackageDeps(root: string): Set<string> {
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8')) as {
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
    ignores,
    extra = [],
  } = options;

  const deps = readPackageDeps(root);
  const configs: FlatConfigArray = [];

  configs.push({ ignores: [...DEFAULT_IGNORES, ...(ignores ?? [])] });

  configs.push(...base({ root }));

  if (enableAstro) {
    const astroOpts = typeof enableAstro === 'object' ? enableAstro : {};
    configs.push(...astro({ i18n: deps.has('@astroscope/i18n'), ...astroOpts }));
  }

  if (enableReact) {
    const reactOpts = typeof enableReact === 'object' ? enableReact : {};
    configs.push(...react({ vite: deps.has('vite'), ...reactOpts }));
  }

  if (tailwindOptions) {
    configs.push(...tailwind(tailwindOptions));
  }

  configs.push(...imports());
  configs.push(...stylistic());

  configs.push(...extra);

  return configs;
}
