import { join } from 'node:path';

import globals from 'globals';
import { describe, expect, it } from 'vitest';

import { JS_TS_FILES } from '../src/files.js';
import { base } from '../src/presets/base.js';
import type { FlatConfigArray } from '../src/types.js';
import { lint, ruleIds } from './helpers/lint.js';

const ROOT = join(import.meta.dirname, 'fixtures', 'plain');

// browser globals must be enabled for `no-restricted-globals` to resolve them;
// otherwise `no-undef` swallows the reference first.
const withBrowserGlobals = (config: FlatConfigArray): FlatConfigArray => [
  ...config,
  { files: JS_TS_FILES, languageOptions: { globals: globals.browser } },
];

// use .js so type-aware rules don't try to load the project (they're scoped to **/*.{ts,tsx})
describe('base preset', () => {
  it('always enforces eqeqeq', () => {
    const messages = lint('export const x = (a) => a == 1;', base({ root: ROOT }), 'a.js');
    expect(ruleIds(messages)).toContain('eqeqeq');
  });

  it('flags unused parameters but not those prefixed with _', () => {
    const flagged = lint('export const f = (a, b) => a;', base({ root: ROOT }), 'a.js');
    expect(ruleIds(flagged)).toContain('@typescript-eslint/no-unused-vars');

    const ignored = lint('export const f = (a, _b) => a;', base({ root: ROOT }), 'a.js');
    expect(ruleIds(ignored)).not.toContain('@typescript-eslint/no-unused-vars');
  });

  it('enforces object-shorthand', () => {
    const messages = lint('export const x = { foo: foo };', base({ root: ROOT }), 'a.js');
    expect(ruleIds(messages)).toContain('object-shorthand');
  });

  it('flags useless concatenation', () => {
    const messages = lint('export const x = "a" + "b";', base({ root: ROOT }), 'a.js');
    expect(ruleIds(messages)).toContain('no-useless-concat');
  });

  it('enforces prefer-template over string concatenation', () => {
    const messages = lint('export const x = "hi " + name;', base({ root: ROOT }), 'a.js');
    expect(ruleIds(messages)).toContain('prefer-template');
  });

  it('does not crash on .json files (rules scoped to JS_TS_FILES)', () => {
    const messages = lint('{ "name": "x" }', base({ root: ROOT }), 'package.json');
    expect(messages.filter((m) => m.fatal)).toHaveLength(0);
  });

  describe('no-restricted-globals (window.* enforcement)', () => {
    const config = withBrowserGlobals(base({ root: ROOT }));

    it('flags bare references to confusing browser globals', () => {
      const messages = lint('export const x = location.href;', config, 'a.js');
      expect(ruleIds(messages)).toContain('no-restricted-globals');
    });

    it('does not flag explicit window.* access', () => {
      const messages = lint('export const x = window.location.href;', config, 'a.js');
      expect(ruleIds(messages)).not.toContain('no-restricted-globals');
    });

    it('does not flag property access of the same name on other objects', () => {
      const messages = lint('export const f = (obj) => obj.location;', config, 'a.js');
      expect(ruleIds(messages)).not.toContain('no-restricted-globals');
    });

    it('does not flag function parameters that shadow a global', () => {
      const messages = lint('export const handle = (event) => event.target;', config, 'a.js');
      expect(ruleIds(messages)).not.toContain('no-restricted-globals');
    });

    it('does not flag local bindings that shadow a global', () => {
      const messages = lint('export function f() { const name = "x"; return name; }', config, 'a.js');
      expect(ruleIds(messages)).not.toContain('no-restricted-globals');
    });

    it('does not flag destructured assignment from window', () => {
      const messages = lint('export const { location } = window;', config, 'a.js');
      expect(ruleIds(messages)).not.toContain('no-restricted-globals');
    });

    it('does not flag imported bindings with the same name', () => {
      const messages = lint('import { history } from "./x.js"; export const r = history;', config, 'a.js');
      expect(ruleIds(messages)).not.toContain('no-restricted-globals');
    });
  });

  it('uses projectService for type-aware rules by default', () => {
    const config = base({ root: ROOT });
    const typeAwareBlock = config.find((c) =>
      Array.isArray(c.files) && c.files.includes('**/*.{ts,tsx}'),
    );
    const parserOptions = typeAwareBlock?.languageOptions?.parserOptions as
      | { projectService?: boolean; project?: unknown }
      | undefined;
    expect(parserOptions?.projectService).toBe(true);
    expect(parserOptions?.project).toBeUndefined();
  });

  it.each([
    ['no-eval', 'export const x = eval(src);'],
    ['no-implied-eval', 'setTimeout("alert(1)", 0);'],
    ['no-new-func', 'export const f = new Function("a", "return a");'],
    ['no-script-url', 'export const href = "javascript:void(0)";'],
  ])('enables %s, which no composed recommended set turns on', (rule, code) => {
    expect(ruleIds(lint(code, withBrowserGlobals(base({ root: ROOT })), 'a.js'))).toContain(rule);
  });

  it('uses an explicit project path when tsconfigProject is provided', () => {
    const config = base({
      root: ROOT,
      tsconfigProject: ['./tsconfig.app.json', './tsconfig.node.json'],
    });
    const typeAwareBlock = config.find((c) =>
      Array.isArray(c.files) && c.files.includes('**/*.{ts,tsx}'),
    );
    const parserOptions = typeAwareBlock?.languageOptions?.parserOptions as
      | { projectService?: boolean; project?: unknown }
      | undefined;
    expect(parserOptions?.project).toEqual(['./tsconfig.app.json', './tsconfig.node.json']);
    expect(parserOptions?.projectService).toBeUndefined();
  });
});
