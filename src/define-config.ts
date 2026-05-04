import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEFAULT_IGNORES } from './files.js';
import { astro } from './presets/astro.js';
import { base } from './presets/base.js';
import { imports } from './presets/imports.js';
import { json } from './presets/json.js';
import { react } from './presets/react.js';
import { stylistic } from './presets/stylistic.js';
import { tailwind } from './presets/tailwind.js';
import type { FlatConfigArray } from './types.js';

export type DefineConfigOptions = {
  /**
   * Path to the consumer's package root. Pass `import.meta.dirname` from
   * your eslint.config.js. Used for tsconfigRootDir and package.json detection.
   */
  root: string;

  /**
   * Enable React rules (react, react-hooks, jsx-a11y).
   * Auto-detects `vite` in deps to enable react-refresh.
   * @default false
   */
  react?: boolean | undefined;

  /**
   * Enable Astro rules (astro plugin + @astroscope/eslint-plugin).
   * Auto-detects `@astroscope/i18n` in deps to enable i18n rules.
   * @default false
   */
  astro?: boolean | undefined;

  /**
   * Enable Tailwind rules. Requires `entryPoint` (path to your Tailwind CSS entry).
   */
  tailwind?: { entryPoint: string; ignoreClasses?: string[] } | undefined;

  /**
   * Global ignores. Defaults to `DEFAULT_IGNORES` when omitted.
   * Pass an explicit array to replace the defaults — compose with `DEFAULT_IGNORES`
   * if you want to extend them: `ignores: [...DEFAULT_IGNORES, 'public/*']`.
   * Pass `[]` to apply no global ignores.
   */
  ignores?: string[] | undefined;

  /**
   * Additional flat-config blocks appended at the end. Use for project-specific
   * rule overrides, file-scoped configs, or any escape hatch.
   */
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

/**
 * Compose the @entwico/eslint-config flat config.
 *
 * Always-on internally: base, imports, stylistic, json.
 * Opt-in: react, astro, tailwind via the options.
 * Sub-features auto-detected from package.json: vite (→ react-refresh),
 * @astroscope/i18n (→ astroscope i18n rules).
 */
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

  const finalIgnores = ignores ?? DEFAULT_IGNORES;
  if (finalIgnores.length > 0) {
    configs.push({ ignores: finalIgnores });
  }

  configs.push(...base({ root }));

  if (enableAstro) {
    configs.push(...astro({ i18n: deps.has('@astroscope/i18n') }));
  }

  if (enableReact) {
    configs.push(...react({ vite: deps.has('vite') }));
  }

  if (tailwindOptions) {
    configs.push(...tailwind(tailwindOptions));
  }

  configs.push(...imports());
  configs.push(...stylistic());
  configs.push(...json());

  configs.push(...extra);

  return configs;
}
