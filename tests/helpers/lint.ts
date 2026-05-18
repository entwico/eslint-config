import { Linter } from 'eslint';

import type { FlatConfigArray } from '../../src/types.js';

const linter = new Linter({ configType: 'flat' });

/** Run ESLint against code text and return all messages. */
export function lint(code: string, config: FlatConfigArray, filename: string): Linter.LintMessage[] {
  return linter.verify(code, config, filename);
}

/** Extract rule IDs from messages, dropping nulls (parse errors etc.). */
export function ruleIds(messages: Linter.LintMessage[]): string[] {
  return messages.map((m) => m.ruleId).filter((id): id is string => id !== null);
}

/** Assert that lint produces exactly the given rule IDs (any order). */
export function expectRules(messages: Linter.LintMessage[]): { toFire(rules: string[]): void } {
  return {
    toFire(rules: string[]) {
      const actual = ruleIds(messages).toSorted();
      const expected = rules.toSorted();
      if (actual.join(',') !== expected.join(',')) {
        throw new Error(`expected rules [${expected.join(', ')}], got [${actual.join(', ')}]\nmessages:\n${JSON.stringify(messages, null, 2)}`);
      }
    },
  };
}
