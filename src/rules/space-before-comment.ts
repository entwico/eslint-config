import type { Rule } from 'eslint';

/**
 * Require at least one space between code and a trailing comment on the same line.
 *
 * Fills a gap left by `@stylistic/spaced-comment`, which only governs the space
 * after the `//`/`/*` marker — not the gap between preceding code and the comment.
 * Full-line comments (no code before them on the line) are left untouched.
 */
export const spaceBeforeComment: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: { description: 'require a space between code and a trailing comment' },
    fixable: 'whitespace',
    schema: [],
    messages: { missing: 'expected space before comment' },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          const prev = sourceCode.getTokenBefore(comment, { includeComments: true });

          if (!prev?.loc || !prev.range || !comment.loc || !comment.range) {
            continue;
          }

          if (prev.loc.end.line !== comment.loc.start.line) {
            continue;
          }

          // `{/* ... */}` is the idiomatic way to write a JSX/Astro comment
          if (prev.value === '{') {
            // estree's Node union has no JSX members, so widen to read `type`
            const container = sourceCode.getNodeByRangeIndex(prev.range[0]) as { type: string } | null;

            if (container?.type === 'JSXExpressionContainer') {
              continue;
            }
          }

          if (comment.range[0] - prev.range[1] < 1) {
            context.report({
              node: comment,
              messageId: 'missing',
              fix: (fixer) => fixer.insertTextBefore(comment, ' '),
            });
          }
        }
      },
    };
  },
};
