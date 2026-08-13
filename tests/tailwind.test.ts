import { describe, expect, it } from 'vitest';

import { type TailwindCallee, tailwind } from '../src/presets/tailwind.js';

function tailwindSettings(config: Awaited<ReturnType<typeof tailwind>>): Record<string, unknown> {
  const block = config.find((c) => c.settings !== undefined && 'better-tailwindcss' in c.settings);
  const settings = block?.settings as { 'better-tailwindcss'?: Record<string, unknown> } | undefined;

  return settings?.['better-tailwindcss'] ?? {};
}

describe('tailwind preset', () => {
  it('omits callees by default so the plugin keeps its built-in selectors (object keys/values, not strings only)', async () => {
    const settings = tailwindSettings((await tailwind({ entryPoint: 'src/styles/index.css' })));
    expect('callees' in settings).toBe(false);
  });

  it('passes an explicit callees override through to the plugin', async () => {
    const callees: TailwindCallee[] = [['cn', [{ match: 'objectKeys' }]]];
    const settings = tailwindSettings((await tailwind({ entryPoint: 'src/styles/index.css', callees })));
    expect(settings.callees).toEqual(callees);
  });

  it('enables the inline-style rule by default and keeps the plugin rules', async () => {
    const [block] = await tailwind({ entryPoint: 'src/styles/index.css' });
    const rules = block?.rules as Record<string, unknown>;

    expect(rules['@entwico/no-inline-style']).toEqual(['error', {}]);
    expect(Object.keys(rules).some((rule) => rule.startsWith('better-tailwindcss/'))).toBe(true);
    expect((block?.plugins as Record<string, unknown>)['better-tailwindcss']).toBeDefined();
  });

  it('enables the style-tag ban by default and can switch it off', async () => {
    const onBlocks = await tailwind({ entryPoint: 'src/styles/index.css' });
    const offBlocks = await tailwind({ entryPoint: 'src/styles/index.css', noStyleTag: false });

    const on = onBlocks[0]?.rules as Record<string, unknown>;
    const off = offBlocks[0]?.rules as Record<string, unknown>;

    expect(on['@entwico/no-style-tag']).toBe('error');
    expect(off['@entwico/no-style-tag']).toBe('off');
  });

  it('forwards allowProperties and can be switched off', async () => {
    const allowed = await tailwind({
      entryPoint: 'src/styles/index.css',
      noInlineStyle: { allowProperties: ['gridTemplateColumns'] },
    });
    const disabled = await tailwind({ entryPoint: 'src/styles/index.css', noInlineStyle: false });

    expect((allowed[0]?.rules as Record<string, unknown>)['@entwico/no-inline-style'])
      .toEqual(['error', { allowProperties: ['gridTemplateColumns'] }]);
    expect((disabled[0]?.rules as Record<string, unknown>)['@entwico/no-inline-style']).toBe('off');
  });
});
