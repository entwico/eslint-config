import { describe, expect, it } from 'vitest';

import { json } from '../src/presets/json.js';
import { lint, ruleIds } from './helpers/lint.js';

describe('json preset', () => {
  it('flags duplicate keys in .json', () => {
    const code = [
      '{',
      '  "name": "a",',
      '  "name": "b"',
      '}',
    ].join('\n');
    const messages = lint(code, json(), 'pkg.json');
    expect(ruleIds(messages)).toContain('json/no-duplicate-keys');
  });

  it('flags unsafe integer values in .json', () => {
    const messages = lint('{ "n": 9999999999999999999 }', json(), 'a.json');
    expect(ruleIds(messages)).toContain('json/no-unsafe-values');
  });

  it('flags trailing comma in strict .json (parse error)', () => {
    const messages = lint('{ "a": 1, }', json(), 'a.json');
    // parse errors come back as a message with ruleId === null
    expect(messages.some((m) => m.fatal || m.message.includes('Parsing error'))).toBe(true);
  });

  it('treats tsconfig.json as JSONC (allows comments)', () => {
    const code = [
      '{',
      '  // a comment',
      '  "compilerOptions": { "strict": true }',
      '}',
    ].join('\n');
    const messages = lint(code, json(), 'tsconfig.json');
    expect(messages.some((m) => m.fatal)).toBe(false);
  });

  it('treats .vscode/settings.json as JSONC', () => {
    const messages = lint('{ "a": 1 /* trailing */ }', json(), '/abs/path/.vscode/settings.json');
    // JSONC allows comments — should not be a parse error
    expect(messages.some((m) => m.fatal)).toBe(false);
  });

  it('handles .json5 with single quotes and trailing commas', () => {
    const code = [
      '{',
      '  name: \'a\',',
      '}',
    ].join('\n');
    const messages = lint(code, json(), 'a.json5');
    expect(messages.some((m) => m.fatal)).toBe(false);
  });
});
