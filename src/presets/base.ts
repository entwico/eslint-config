import js from '@eslint/js';
import unicornPlugin from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

import { JS_TS_FILES } from '../files.js';
import { entwicoPlugin } from '../plugin.js';
import type { FlatConfigArray } from '../types.js';

const TYPE_AWARE_FILES = ['**/*.{ts,tsx}'];
const TYPE_AWARE_IGNORES = ['**/*.astro/**'];

// canonical list from create-react-app's `confusing-browser-globals`
const CONFUSING_BROWSER_GLOBALS = [
  'addEventListener', 'blur', 'close', 'closed', 'confirm', 'defaultStatus',
  'defaultstatus', 'event', 'external', 'find', 'focus', 'frameElement',
  'frames', 'history', 'innerHeight', 'innerWidth', 'length', 'location',
  'locationbar', 'menubar', 'moveBy', 'moveTo', 'name', 'onblur', 'onerror',
  'onfocus', 'onload', 'onresize', 'onunload', 'open', 'opener', 'opera',
  'outerHeight', 'outerWidth', 'pageXOffset', 'pageYOffset', 'parent', 'print',
  'removeEventListener', 'resizeBy', 'resizeTo', 'screen', 'screenLeft',
  'screenTop', 'screenX', 'screenY', 'scroll', 'scrollbars', 'scrollBy',
  'scrollTo', 'scrollX', 'scrollY', 'self', 'status', 'statusbar', 'stop',
  'toolbar', 'top',
];

export type BaseOptions = {
  /** Pass `import.meta.dirname` from your eslint.config.js. */
  root: string;

  /** Pin specific tsconfig paths. Defaults to `projectService: true`. */
  tsconfigProject?: string | string[] | undefined;
};

/** JS + TypeScript rules including type-aware checks. */
export function base({ root, tsconfigProject }: BaseOptions): FlatConfigArray {
  const typeAwareParserOptions =
    tsconfigProject === undefined
      ? { projectService: true, tsconfigRootDir: root }
      : { project: tsconfigProject, tsconfigRootDir: root };

  return [
    {
      files: JS_TS_FILES,
      languageOptions: {
        parserOptions: { tsconfigRootDir: root },
      },
    },

    { files: JS_TS_FILES, ...js.configs.recommended },

    {
      files: JS_TS_FILES,
      rules: {
        eqeqeq: ['error', 'always'],
        'object-shorthand': 'error',
        'no-useless-concat': 'error',
        'prefer-template': 'error',
        'no-restricted-globals': [
          'error',
          ...CONFUSING_BROWSER_GLOBALS.map((name) => ({
            name,
            message: `Use window.${name} (or globalThis.${name} in worker/SSR code) to make global access explicit.`,
          })),
        ],
        'sort-imports': [
          'error',
          {
            ignoreCase: false,
            ignoreDeclarationSort: true,
            ignoreMemberSort: false,
            memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
            allowSeparatedGroups: false,
          },
        ],
      },
    },

    ...tseslint.configs.recommended.map((c) => ({ files: JS_TS_FILES, ...c })),

    {
      files: JS_TS_FILES,
      plugins: unicornPlugin.configs.recommended.plugins ?? {},
      rules: {
        ...unicornPlugin.configs.recommended.rules,

        // fights idiomatic naming (`props`, `e`, `ref`, etc.)
        'unicorn/name-replacements': 'off',

        // conflicts with PascalCase React/Astro component files
        'unicorn/filename-case': 'off',

        // React refs and many DOM APIs legitimately use null
        'unicorn/no-null': 'off',

        // reduce/forEach are legitimate idioms — the rest of the `prefer-*` family already covers the wins
        'unicorn/no-array-reduce': 'off',
        'unicorn/no-for-each': 'off',

        // miscategorizes closure-capturing helpers as hoistable
        'unicorn/consistent-function-scoping': 'off',

        // top-level await isn't available in every target/env
        'unicorn/prefer-top-level-await': 'off',

        // common in Astro page components and util files
        'unicorn/no-anonymous-default-export': 'off',

        // too opinionated about how to import specific packages
        'unicorn/import-style': 'off',

        // too aggressive for a shared config
        'unicorn/expiring-todo-comments': 'off',

        // less readable in common projects
        'unicorn/prefer-global-this': 'off',

        // too opinionated — fights idiomatic flag/predicate names (`changed`, `enabled`, `hasFoo`)
        'unicorn/consistent-boolean-name': 'off',

        // fires on idiomatic nested zod schemas (`z.object({ a: z.array(z.object(...)) })`)
        'unicorn/max-nested-calls': 'off',

        // node servers and frontend roots legitimately run side effects at module top level
        'unicorn/no-top-level-side-effects': 'off',

        // fights singletons / lazy init (module-scope assignment from inside a function)
        'unicorn/no-top-level-assignment-in-function': 'off',

        // process.exit is idiomatic in node servers/CLIs (shutdown handlers)
        'unicorn/no-process-exit': 'off',

        // forbids single-line jsdoc (`/** … */` on one line), which is idiomatic for brief docs
        'unicorn/single-line-block-comment-style': 'off',
      },
    },

    {
      files: JS_TS_FILES,
      rules: {
        '@typescript-eslint/consistent-type-imports': [
          'error',
          {
            prefer: 'type-imports',
            disallowTypeAnnotations: true,
            fixStyle: 'inline-type-imports',
          },
        ],
        '@typescript-eslint/no-import-type-side-effects': 'error',
        '@typescript-eslint/explicit-function-return-type': 0,
        '@typescript-eslint/explicit-module-boundary-types': 0,
        '@typescript-eslint/no-empty-function': 0,
        '@typescript-eslint/no-unused-expressions': 0,
        '@typescript-eslint/no-empty-interface': 0,
        '@typescript-eslint/no-explicit-any': 0,
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            varsIgnorePattern: '^_',
            argsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
          },
        ],
      },
    },

    // port from `eslint-plugin-security`, plus the eval family
    {
      files: JS_TS_FILES,
      plugins: { '@entwico': entwicoPlugin },
      rules: {
        '@entwico/no-bidi-characters': 'error',
        '@entwico/no-unsafe-regex': 'error',
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',
        'no-script-url': 'error',
      },
    },

    {
      files: TYPE_AWARE_FILES,
      ignores: TYPE_AWARE_IGNORES,
      languageOptions: {
        parserOptions: typeAwareParserOptions,
      },
      rules: {
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/no-deprecated': 'error',
        '@typescript-eslint/require-await': 'error',
      },
    },
  ];
}
