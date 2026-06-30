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
    expect(ruleIds(messages)).toContain('@eslint-react/no-missing-key');
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
    expect(ruleIds(messages)).toContain('@eslint-react/exhaustive-deps');
  });

  it('forwards customEffectHooks to @eslint-react/exhaustive-deps', () => {
    const configs = react({ customEffectHooks: '(useIsomorphicLayoutEffect)' });
    const block = configs.findLast((c) => c.rules?.['@eslint-react/exhaustive-deps'] !== undefined);
    expect(block?.rules?.['@eslint-react/exhaustive-deps']).toEqual([
      'warn',
      { additionalHooks: '(useIsomorphicLayoutEffect)' },
    ]);
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
});
