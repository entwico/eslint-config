import tailwindPlugin from 'eslint-plugin-better-tailwindcss';

import { JS_TS_FILES } from '../files.js';
import type { FlatConfigArray } from '../types.js';

export type TailwindOptions = {
  /**
   * Path to the Tailwind CSS entry point file.
   * @example 'src/styles/index.css'
   */
  entryPoint: string;

  /**
   * Custom function names that accept Tailwind classes.
   * @default ['cn', 'cva']
   */
  callees?: string[] | undefined;

  /**
   * Root font size for rem calculations.
   * @default 16
   */
  rootFontSize?: number | undefined;

  /**
   * Attribute patterns to check for Tailwind classes.
   * @default ['class', 'className', 'ngClass', 'class:list', '[A-Za-z]+ClassName']
   */
  attributes?: string[] | undefined;

  /**
   * Classes to ignore from unknown class checks.
   */
  ignoreClasses?: string[] | undefined;
};

/**
 * Tailwind CSS linting with eslint-plugin-better-tailwindcss.
 */
export function tailwind(options: TailwindOptions): FlatConfigArray {
  const {
    entryPoint,
    callees = ['cn', 'cva'],
    rootFontSize = 16,
    attributes = ['class', 'className', 'ngClass', 'class:list', '[A-Za-z]+ClassName'],
    ignoreClasses,
  } = options;

  // spread the recommended config and merge with our settings
  const recommendedConfig = tailwindPlugin.configs.recommended as Record<string, unknown>;

  return [
    {
      files: JS_TS_FILES,
      ...recommendedConfig,
      settings: {
        'better-tailwindcss': {
          entryPoint,
          rootFontSize,
          attributes,
          callees,
        },
      },
      rules: {
        ...((recommendedConfig.rules as Record<string, unknown>) ?? {}),
        'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
        'better-tailwindcss/enforce-shorthand-classes': 'off',
        'better-tailwindcss/enforce-consistent-important-position': 'off',
        'better-tailwindcss/enforce-consistent-variable-syntax': 'off',
        ...(ignoreClasses
          ? {
              'better-tailwindcss/no-unknown-classes': ['error', { ignore: ignoreClasses }],
            }
          : {}),
      },
    },
  ];
}
