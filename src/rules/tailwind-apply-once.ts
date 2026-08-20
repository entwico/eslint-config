import type { Rule } from 'eslint';

import type { CssNode } from '../utils/css-apply.js';

function isApply(node: CssNode | undefined): boolean {
  return node?.type === 'Atrule' && String(node.name).toLowerCase() === 'apply';
}

/**
 * One `@apply` per block. Consecutive `@apply` runs merge automatically —
 * concatenating preludes in order is output-identical. An `@apply` separated
 * from the previous one by other declarations is still reported but not
 * fixed: `@apply` inlines its declarations at its position, so hoisting it
 * past a declaration could change the cascade.
 */
export const tailwindApplyOnce: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: { description: 'merge multiple @apply at-rules within one block' },
    schema: [],
    messages: {
      splitApply: 'merge this `@apply` into the first one of the block',
    },
  },
  create(context) {
    const { sourceCode } = context;
    const text = sourceCode.getText();

    /** The at-rule's whole line: leading indentation, the `;`, one newline. */
    function lineRange(node: CssNode): [number, number] {
      const range = sourceCode.getRange(node as never);
      let [start, end] = range;

      while (start > 0 && (text[start - 1] === ' ' || text[start - 1] === '\t')) {
        start -= 1;
      }

      // the node range may or may not include the `;` — extend only when a
      // semicolon actually follows, so no unrelated whitespace is consumed
      let scan = end;

      while (scan < text.length && (text[scan] === ' ' || text[scan] === '\t')) {
        scan += 1;
      }

      if (text[scan] === ';') {
        end = scan + 1;
      }

      if (start > 0 && text[start - 1] === '\n') {
        start -= 1;

        if (start > 0 && text[start - 1] === '\r') {
          start -= 1;
        }
      }

      return [start, end];
    }

    return {
      Block(node: CssNode) {
        const children = (node.children ?? []) as CssNode[];
        const first = children.find((child) => isApply(child));

        if (!first) {
          return;
        }

        let runStart = first;

        for (let index = children.indexOf(first) + 1; index < children.length; index += 1) {
          const child = children[index]!;

          if (!isApply(child)) {
            runStart = undefined as never;
            continue;
          }

          if (!runStart) {
            // a new run after non-apply content: its first member is the merge
            // target for the rest of the run, reported but not fixable itself
            runStart = child;
            context.report({ node: child as never, messageId: 'splitApply' });
            continue;
          }

          const target = runStart;
          const classes = sourceCode.getText(child.prelude as never).trim().replaceAll(/\s+/g, ' ');

          context.report({
            node: child as never,
            messageId: 'splitApply',
            fix: (fixer) => [
              fixer.insertTextAfter(target.prelude as never, ` ${classes}`),
              fixer.removeRange(lineRange(child)),
            ],
          });
        }
      },
    };
  },
};
