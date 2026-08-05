import { describe, expect, it } from 'vitest';

import { imports } from '../src/presets/imports.js';
import { lint, ruleIds } from './helpers/lint.js';

describe('imports preset', () => {
  it('flags wrong group order (sibling before external)', () => {
    const code = [
      'import { Card } from \'./Card.js\';',
      'import { useState } from \'react\';',
    ].join('\n');
    const messages = lint(code, imports(), 'a.tsx');
    expect(ruleIds(messages)).toContain('import-x/order');
  });

  it('places `@/` imports in the internal group, between external and parent', () => {
    const code = [
      'import { useState } from \'react\';',
      'import { foo } from \'../parent.js\';',
      'import { cn } from \'@/lib/cn.js\';',
    ].join('\n');
    const messages = lint(code, imports(), 'a.tsx');
    // @/ should come BEFORE ../parent — so this order is wrong
    expect(ruleIds(messages)).toContain('import-x/order');
  });

  it('accepts correct order: builtin, external, internal, parent, sibling', () => {
    const code = [
      'import path from \'node:path\';',
      'import { useState } from \'react\';',
      'import { cn } from \'@/lib/cn.js\';',
      'import { foo } from \'../parent.js\';',
      'import { Card } from \'./Card.js\';',
    ].join('\n');
    const messages = lint(code, imports(), 'a.tsx');
    expect(ruleIds(messages)).not.toContain('import-x/order');
  });

  it('flags duplicate imports', () => {
    const code = [
      'import { a } from \'foo\';',
      'import { b } from \'foo\';',
    ].join('\n');
    const messages = lint(code, imports(), 'a.ts');
    expect(ruleIds(messages)).toContain('import-x/no-duplicates');
  });

  it('alphabetizes within a group', () => {
    const code = [
      'import { z } from \'zod\';',
      'import { a } from \'astro\';',
    ].join('\n');
    const messages = lint(code, imports(), 'a.ts');
    expect(ruleIds(messages)).toContain('import-x/order');
  });

  it('does not run on .json files (scoped to JS_TS_FILES)', () => {
    const messages = lint('{"a": 1}', imports(), 'config.json');
    expect(ruleIds(messages).filter((r) => r.startsWith('import-x/'))).toHaveLength(0);
  });

  it('does not enforce blank lines between groups', () => {
    // tightly packed (no blanks) is acceptable
    const code = [
      'import path from \'node:path\';',
      'import { useState } from \'react\';',
      'import { cn } from \'@/lib/cn.js\';',
      'import { foo } from \'../parent.js\';',
      'import { Card } from \'./Card.js\';',
    ].join('\n');
    const messages = lint(code, imports(), 'a.tsx');
    expect(ruleIds(messages)).not.toContain('import-x/order');
  });

  it('accepts loosely packed imports with consumer-chosen blanks', () => {
    const code = [
      'import path from \'node:path\';',
      'import { useState } from \'react\';',
      '',
      'import { cn } from \'@/lib/cn.js\';',
      '',
      'import { foo } from \'../parent.js\';',
      'import { Card } from \'./Card.js\';',
    ].join('\n');
    const messages = lint(code, imports(), 'a.tsx');
    expect(ruleIds(messages)).not.toContain('import-x/order');
  });

  it('does not enforce ordering on side-effect imports (warnOnUnassignedImports default false)', () => {
    const code = [
      'import \'@/index.css\';',
      'import \'./opentelemetry.js\';',
      '',
      'import path from \'node:path\';',
      'import { useState } from \'react\';',
    ].join('\n');
    const messages = lint(code, imports(), 'a.tsx');
    expect(ruleIds(messages)).not.toContain('import-x/order');
  });

  it('bans re-exports by default', () => {
    const messages = lint('export { Button } from \'./Button.js\';', imports(), 'a.tsx');
    expect(ruleIds(messages)).toContain('@entwico/no-reexport');
  });

  it('can be switched off entirely for library packages', () => {
    const messages = lint('export { Button } from \'./Button.js\';', imports({ noReexport: false }), 'a.tsx');
    expect(ruleIds(messages)).not.toContain('@entwico/no-reexport');
  });

  it('silences unicorn/prefer-export-from, which pushes code into the banned form', () => {
    const rules = imports()[0]?.rules as Record<string, unknown>;
    expect(rules['unicorn/prefer-export-from']).toBe('off');

    const kept = imports({ noReexport: false })[0]?.rules as Record<string, unknown>;
    expect('unicorn/prefer-export-from' in kept).toBe(false);
  });

  it('exempts the allowed entry-point files only', () => {
    const config = imports({ noReexport: { allow: ['**/index.ts'] } });
    const code = 'export { Button } from \'./Button.js\';';

    expect(ruleIds(lint(code, config, 'index.ts'))).not.toContain('@entwico/no-reexport');
    expect(ruleIds(lint(code, config, 'other.ts'))).toContain('@entwico/no-reexport');
  });
});
