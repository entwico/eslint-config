import type { Linter } from 'eslint';

import type { FlatConfigArray } from '../types.js';

function process(
  rules: Partial<Linter.RulesRecord>,
): { rules: Partial<Linter.RulesRecord>; changed: boolean } {
  let changed = false;
  const out: Partial<Linter.RulesRecord> = {};

  for (const [id, entry] of Object.entries(rules)) {
    if (entry === 'warn' || entry === 1) {
      out[id] = 'error';
      changed = true;
    } else if (Array.isArray(entry) && (entry[0] === 'warn' || entry[0] === 1)) {
      out[id] = ['error', ...entry.slice(1)] as Linter.RuleEntry;
      changed = true;
    } else {
      out[id] = entry;
    }
  }

  return { rules: changed ? out : rules, changed };
}

/**
 * Promote every `warn`-severity rule in the config to `error`.
 * Preserve the rest (e.g. additional configs).
 */
export function promoteWarnings(blocks: FlatConfigArray): FlatConfigArray {
  return blocks.map((block) => {
    if (block.rules === undefined) return block;

    const { rules, changed } = process(block.rules);

    return changed ? { ...block, rules } : block;
  });
}
