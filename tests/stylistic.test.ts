import { describe, expect, it } from 'vitest';

import { stylistic } from '../src/presets/stylistic.js';
import { lint, ruleIds } from './helpers/lint.js';

describe('stylistic preset', () => {
  it('flags double quotes (single-quote rule)', () => {
    const messages = lint('const x = "double";', stylistic(), 'a.ts');
    expect(ruleIds(messages)).toContain('@stylistic/quotes');
  });

  it('flags missing semicolons', () => {
    const messages = lint('const x = 1', stylistic(), 'a.ts');
    expect(ruleIds(messages)).toContain('@stylistic/semi');
  });

  it('flags missing trailing comma in multiline', () => {
    const code = [
      'const obj = {',
      '  a: 1,',
      '  b: 2',
      '};',
    ].join('\n');
    const messages = lint(code, stylistic(), 'a.ts');
    expect(ruleIds(messages)).toContain('@stylistic/comma-dangle');
  });

  it('flags stroustrup brace style (we enforce 1tbs)', () => {
    const code = [
      'if (true) {',
      '  doIt();',
      '}',
      'else {',
      '  skip();',
      '}',
    ].join('\n');
    const messages = lint(code, stylistic(), 'a.ts');
    expect(ruleIds(messages)).toContain('@stylistic/brace-style');
  });

  it('requires parens around single-arg arrow (arrow-parens: always)', () => {
    const messages = lint('const f = x => x + 1;', stylistic(), 'a.ts');
    expect(ruleIds(messages)).toContain('@stylistic/arrow-parens');
  });

  it('accepts single-arg arrow with parens', () => {
    const messages = lint('const f = (x) => x + 1;', stylistic(), 'a.ts');
    expect(ruleIds(messages)).not.toContain('@stylistic/arrow-parens');
  });

  it('keeps = at end of line, not on next line (operator-linebreak: after)', () => {
    const code = [
      'const x',
      '  = 1 + 2;',
    ].join('\n');
    const messages = lint(code, stylistic(), 'a.ts');
    expect(ruleIds(messages)).toContain('@stylistic/operator-linebreak');
  });

  it('disables jsx-one-expression-per-line', () => {
    const code = 'const x = <button>Count: {n}</button>;';
    const messages = lint(code, stylistic(), 'a.tsx');
    expect(ruleIds(messages)).not.toContain('@stylistic/jsx-one-expression-per-line');
  });

  it('flags a trailing comment with no space before it', () => {
    const messages = lint('const x = 1;// trailing', stylistic(), 'a.ts');
    expect(ruleIds(messages)).toContain('@entwico/space-before-comment');
  });

  it('flags a trailing block comment with no space before it', () => {
    const messages = lint('const x = 1;/* trailing */', stylistic(), 'a.ts');
    expect(ruleIds(messages)).toContain('@entwico/space-before-comment');
  });

  it('accepts a trailing comment with a space before it', () => {
    const messages = lint('const x = 1; // trailing', stylistic(), 'a.ts');
    expect(ruleIds(messages)).not.toContain('@entwico/space-before-comment');
  });

  it('ignores a JSX expression-container comment', () => {
    const code = 'const x = <div>{/* a comment */}</div>;';
    const messages = lint(code, stylistic(), 'a.tsx');
    expect(ruleIds(messages)).not.toContain('@entwico/space-before-comment');
  });

  it('ignores full-line comments', () => {
    const code = [
      '// leading comment',
      'const x = 1;',
    ].join('\n');
    const messages = lint(code, stylistic(), 'a.ts');
    expect(ruleIds(messages)).not.toContain('@entwico/space-before-comment');
  });
});
