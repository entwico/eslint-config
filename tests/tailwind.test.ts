import { describe, expect, it } from 'vitest';

import { type TailwindCallee, tailwind } from '../src/presets/tailwind.js';

function tailwindSettings(config: ReturnType<typeof tailwind>): Record<string, unknown> {
  const block = config.find((c) => c.settings !== undefined && 'better-tailwindcss' in c.settings);
  const settings = block?.settings as { 'better-tailwindcss'?: Record<string, unknown> } | undefined;

  return settings?.['better-tailwindcss'] ?? {};
}

describe('tailwind preset', () => {
  it('omits callees by default so the plugin keeps its built-in selectors (object keys/values, not strings only)', () => {
    const settings = tailwindSettings(tailwind({ entryPoint: 'src/styles/index.css' }));
    expect('callees' in settings).toBe(false);
  });

  it('passes an explicit callees override through to the plugin', () => {
    const callees: TailwindCallee[] = [['cn', [{ match: 'objectKeys' }]]];
    const settings = tailwindSettings(tailwind({ entryPoint: 'src/styles/index.css', callees }));
    expect(settings.callees).toEqual(callees);
  });
});
