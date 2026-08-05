import type { Rule } from 'eslint';

type AnyNode = { type: string } & Record<string, any>;

/** `define:vars` parses as a namespaced name, `class` as a plain identifier. */
function attributeName(attribute: AnyNode): string {
  const name = attribute.name as AnyNode | undefined;

  if (name?.type === 'JSXNamespacedName') {
    return `${name.namespace.name as string}:${name.name.name as string}`;
  }

  return (name?.name ?? '') as string;
}

/**
 * Forbid `<style>` blocks in favour of Tailwind classes.
 *
 * Deliberately blunt: everything a `<style>` block can hold — keyframes, media
 * queries, global resets, styling for injected third-party markup — is legitimate
 * some of the time, and no heuristic separates those from CSS that should have been
 * classes. The escape hatch is an `eslint-disable-next-line` on the block, which is
 * why this reports the opening tag rather than the whole element.
 *
 * The one built-in exemption is `define:vars`, which exists precisely to carry values
 * a static class cannot — there is nothing to rewrite it into.
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

        // `define:vars` is Astro's bridge for values a class cannot carry — no class replaces it
        const attributes = (node.attributes ?? []) as AnyNode[];

        if (attributes.some((attribute) => attributeName(attribute) === 'define:vars')) {
          return;
        }

        context.report({ node: node as never, messageId: 'styleTag' });
      },
    };
  },
};
