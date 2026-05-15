import tailwindPlugin from 'eslint-plugin-better-tailwindcss';

import { JS_TS_FILES } from '../files.js';
import type { FlatConfigArray } from '../types.js';

export type TailwindOptions = {
  /** Path to the Tailwind CSS entry file. */
  entryPoint: string;

  /** Functions that accept Tailwind class strings. */
  callees?: string[] | undefined;

  /** Root font size for rem calculations. */
  rootFontSize?: number | undefined;

  /** Attribute patterns to check for class strings. */
  attributes?: string[] | undefined;

  /** Class names to ignore in the unknown-class check. */
  ignoreClasses?: string[] | undefined;
};

/** Tailwind CSS linting via eslint-plugin-better-tailwindcss. */
export function tailwind(options: TailwindOptions): FlatConfigArray {
  const {
    entryPoint,
    callees = ['cn', 'cva'],
    rootFontSize = 16,
    attributes = ['class', 'className', 'ngClass', 'class:list', '[A-Za-z]+ClassName'],
    ignoreClasses,
  } = options;

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
        ...(recommendedConfig.rules as Record<string, unknown>),
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
