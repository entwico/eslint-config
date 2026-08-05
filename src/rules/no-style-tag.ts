import type { Rule } from 'eslint';

type AnyNode = { type: string } & Record<string, any>;

/**
 * Forbid `<style>` blocks in favour of Tailwind classes.
 *
 * Deliberately blunt: everything a `<style>` block can hold — keyframes, media
 * queries, global resets, styling for injected third-party markup — is legitimate
 * some of the time, and no heuristic separates those from CSS that should have been
 * classes. The escape hatch is an `eslint-disable-next-line` on the block, which is
 * why this reports the opening tag rather than the whole element.
 */
export const noStyleTag: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'disallow `<style>` blocks in favour of tailwind classes' },
    schema: [],
    messages: {
      styleTag: 'no `<style>` blocks — use tailwind classes, or disable this rule on the block',
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node: AnyNode) {
        const name = node.name as AnyNode;

        if (name.type !== 'JSXIdentifier' || (name.name as string).toLowerCase() !== 'style') {
          return;
        }

        context.report({ node: node as never, messageId: 'styleTag' });
      },
    };
  },
};
