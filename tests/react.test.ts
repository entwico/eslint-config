import { describe, expect, it } from 'vitest';

import { react } from '../src/presets/react.js';
import { lint, ruleIds } from './helpers/lint.js';

describe('react preset', () => {
  it('flags missing alt attribute on img (jsx-a11y)', () => {
    const code = 'export const X = () => <img src="x.png" />;';
    const messages = lint(code, react(), 'a.tsx');
    expect(ruleIds(messages)).toContain('jsx-a11y/alt-text');
  });

  it('flags missing key prop in mapped JSX', () => {
    const code = 'export const X = (items) => items.map(i => <li>{i}</li>);';
    const messages = lint(code, react(), 'a.tsx');
    expect(ruleIds(messages)).toContain('react/jsx-key');
  });

  it('does not require React import (react-in-jsx-scope off)', () => {
    const code = 'export const X = () => <div />;';
    const messages = lint(code, react(), 'a.tsx');
    expect(ruleIds(messages)).not.toContain('react/react-in-jsx-scope');
  });

  it('enables prefer-read-only-props by default', () => {
    const configs = react();
    const block = configs.find((c) => c.rules?.['react/prefer-read-only-props'] !== undefined);
    expect(block?.rules?.['react/prefer-read-only-props']).toBe('error');
  });

  it('flags useEffect with missing dependency', () => {
    const code = [
      'import { useEffect, useState } from \'react\';',
      'export const X = (id) => {',
      '  const [n, setN] = useState(0);',
      '  useEffect(() => { setN(id); }, []);',
      '  return null;',
      '};',
    ].join('\n');
    const messages = lint(code, react(), 'a.tsx');
    expect(ruleIds(messages)).toContain('react-hooks/exhaustive-deps');
  });

  it('enables react-refresh when reactRefresh: true', () => {
    const code = [
      'export const helper = (x) => x + 1;',
      'export const X = () => null;',
    ].join('\n');
    const messages = lint(code, react({ reactRefresh: true }), 'a.tsx');
    expect(ruleIds(messages)).toContain('react-refresh/only-export-components');
  });

  it('does not enable react-refresh by default', () => {
    const code = [
      'export const helper = (x) => x + 1;',
      'export const X = () => null;',
    ].join('\n');
    const messages = lint(code, react(), 'a.tsx');
    expect(ruleIds(messages)).not.toContain('react-refresh/only-export-components');
  });

  it('disables compiler-specific react-hooks rules by default', () => {
    const configs = react();
    const hooksBlock = configs.find((c) => c.rules !== undefined && 'react-hooks/refs' in c.rules);
    expect(hooksBlock?.rules?.['react-hooks/refs']).toBe('off');
    expect(hooksBlock?.rules?.['react-hooks/incompatible-library']).toBe('off');
    expect(hooksBlock?.rules?.['react-hooks/unsupported-syntax']).toBe('off');
    expect(hooksBlock?.rules?.['react-hooks/set-state-in-effect']).toBe('off');
  });

  it('keeps compiler-specific react-hooks rules on when reactCompiler: true', () => {
    const configs = react({ reactCompiler: true });
    const hooksBlock = configs.find((c) => c.rules !== undefined && 'react-hooks/exhaustive-deps' in c.rules);
    expect(hooksBlock?.rules?.['react-hooks/refs']).not.toBe('off');
    expect(hooksBlock?.rules?.['react-hooks/incompatible-library']).not.toBe('off');
    expect(hooksBlock?.rules?.['react-hooks/unsupported-syntax']).not.toBe('off');
    expect(hooksBlock?.rules?.['react-hooks/set-state-in-effect']).not.toBe('off');
  });
});
