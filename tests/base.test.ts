import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { base } from '../src/presets/base.js';
import { lint, ruleIds } from './helpers/lint.js';

const ROOT = join(import.meta.dirname, 'fixtures', 'plain');

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
