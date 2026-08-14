import { type AST, RegExpParser, visitRegExpAST } from '@eslint-community/regexpp';
import type { Rule } from 'eslint';
import type * as ESTree from 'estree';

const parser = new RegExpParser();

/** Elements that always consume at least one character, so repeating them can be ambiguous. */
const CONSUMING = new Set([
  'Backreference',
  'CapturingGroup',
  'Character',
  'CharacterClass',
  'CharacterSet',
  'ExpressionCharacterClass',
  'Group',
]);

/**
 * Only unbounded quantifiers can blow up. `{n,m}` with a finite max caps the work no matter
 * how the input is shaped, which is what keeps shapes like `^(\d{1,3}\.){3}\d{1,3}$` — the
 * canonical `safe-regex` false positive — out of the report.
 */
function isUnbounded(quantifier: AST.Quantifier): boolean {
  return quantifier.max === Infinity;
}

/**
 * The unbounded quantifier an element reduces to when it holds nothing else.
 *
 * `(a+)`, `((a+))` and `(a+|b)` all reduce. `(a+b)` does not: the mandatory `b` pins where
 * each repetition ends, so the engine never has a choice about how to split the input, and
 * `(a+b)+` is in fact safe.
 */
function reducesToUnboundedQuantifier(element: AST.Element): AST.Quantifier | null {
  if (element.type === 'Quantifier') {
    return isUnbounded(element) && CONSUMING.has(element.element.type) ? element : null;
  }

  if (element.type !== 'Group' && element.type !== 'CapturingGroup') {
    return null;
  }

  for (const alternative of element.alternatives) {
    if (alternative.elements.length !== 1) {
      continue;
    }

    const [only] = alternative.elements;
    const found = only === undefined ? null : reducesToUnboundedQuantifier(only);

    if (found !== null) {
      return found;
    }
  }

  return null;
}

type MessageId = 'exponential' | 'polynomial';
type Report = (messageId: MessageId, target: AST.Node) => void;

function findUnsafe(pattern: AST.Pattern, report: Report): void {
  visitRegExpAST(pattern, {
    // `(a+)+` — every repetition of the outer quantifier can split its input many ways
    onQuantifierEnter(quantifier) {
      if (isUnbounded(quantifier) && reducesToUnboundedQuantifier(quantifier.element) !== null) {
        report('exponential', quantifier);
      }
    },

    // `\s*\s*` — identical source means the two ranges certainly overlap, so the boundary
    // between them is free to slide. Comparing raw text keeps this at zero false positives
    // (at the cost of missing overlaps that are spelled differently, e.g. `\s*[ \t]*`).
    onAlternativeEnter(alternative) {
      const { elements } = alternative;

      for (let index = 0; index + 1 < elements.length; index++) {
        const left = elements[index];
        const right = elements[index + 1];

        if (left?.type !== 'Quantifier' || right?.type !== 'Quantifier') {
          continue;
        }

        if (isUnbounded(left) && isUnbounded(right) && left.element.raw === right.element.raw) {
          report('polynomial', right);
        }
      }
    },
  });
}

/**
 * Disallow regular expressions that can be driven into catastrophic backtracking (ReDoS).
 *
 * Deliberately narrow. It reports two shapes that are always a mistake — nested unbounded
 * quantifiers, and an unbounded quantifier repeated over the same characters — and stays
 * quiet otherwise. That is a smaller net than `safe-regex` (which flags on raw star height
 * and so trips over every bounded `{n,m}` nesting), and a much smaller one than a real NFA
 * ambiguity analysis: overlapping alternations such as `(a|ab)+` are not detected. Projects
 * that want the thorough version should add `eslint-plugin-regexp` and its
 * `no-super-linear-backtracking`, which does the full analysis via `refa`.
 *
 * Covers regex literals and `new RegExp('...')` / `RegExp('...')` built from a string
 * literal; a pattern assembled at runtime has nothing to analyse statically.
 */
export const noUnsafeRegex: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'disallow regular expressions vulnerable to catastrophic backtracking' },
    schema: [],
    messages: {
      exponential: 'unsafe regular expression: `{{raw}}` nests unbounded quantifiers, so non-matching input can force exponential backtracking (ReDoS)',
      polynomial: 'unsafe regular expression: `{{raw}}` repeats an unbounded quantifier over the same characters, so non-matching input can force quadratic backtracking (ReDoS)',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    /**
     * `patternStart` is the source index the pattern text begins at, or null when the two
     * cannot be mapped. Given it, reports point at the offending sub-expression instead of
     * the whole literal.
     */
    function check(pattern: string, flags: string, node: ESTree.Node, patternStart: number | null): void {
      let ast: AST.Pattern;

      try {
        ast = parser.parsePattern(pattern, 0, pattern.length, {
          unicode: flags.includes('u'),
          unicodeSets: flags.includes('v'),
        });
      } catch {
        // an unparseable pattern is `no-invalid-regexp`'s business, not ours
        return;
      }

      findUnsafe(ast, (messageId, target) => {
        const data = { raw: target.raw };

        if (patternStart === null) {
          context.report({ node, messageId, data });

          return;
        }

        context.report({
          loc: {
            start: sourceCode.getLocFromIndex(patternStart + target.start),
            end: sourceCode.getLocFromIndex(patternStart + target.end),
          },
          messageId,
          data,
        });
      });
    }

    function checkRegExpCall(node: ESTree.CallExpression | ESTree.NewExpression): void {
      if (node.callee.type !== 'Identifier' || node.callee.name !== 'RegExp') {
        return;
      }

      const [patternArgument, flagsArgument] = node.arguments;

      if (patternArgument?.type !== 'Literal' || typeof patternArgument.value !== 'string') {
        return;
      }

      const flags =
        flagsArgument?.type === 'Literal' && typeof flagsArgument.value === 'string' ? flagsArgument.value : '';

      // string escapes shift every offset, so only map positions when the quoted text and
      // the resulting value are character-for-character identical
      const quoted = patternArgument.raw?.slice(1, -1);
      const start =
        quoted === patternArgument.value && patternArgument.range !== undefined ? patternArgument.range[0] + 1 : null;

      check(patternArgument.value, flags, node, start);
    }

    return {
      Literal(node) {
        if (!('regex' in node)) {
          return;
        }

        // the pattern starts one character past the opening `/`, so offsets map 1:1
        const start = node.range === undefined ? null : node.range[0] + 1;

        check(node.regex.pattern, node.regex.flags, node, start);
      },

      CallExpression: checkRegExpCall,
      NewExpression: checkRegExpCall,
    };
  },
};
