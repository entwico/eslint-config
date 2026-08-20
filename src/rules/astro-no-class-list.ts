import type { Rule } from 'eslint';

type AnyNode = { type: string } & Record<string, any>;

function isClassList(attribute: AnyNode): boolean {
  const name = attribute.name as AnyNode | undefined;

  return name?.type === 'JSXNamespacedName' &&
    name.namespace?.name === 'class' &&
    name.name?.name === 'list';
}

/**
 * Forbid Astro's `class:list` directive in favour of `class` with `cn()`.
 *
 * `cn()` is the one class-merging idiom shared by JSX and Astro markup, and it is
 * a better-tailwindcss callee, so its arguments get the full class linting
 * (ordering, unknown classes, canonicalization) in every file type. Keeping
 * conditional classes there instead of the Astro-only directive means one
 * spelling everywhere and no rules-of-tailwind blind spots.
 *
 * No autofix: `class:list` merges with a sibling `class` attribute and runs its
 * value through clsx semantics, so a mechanical rename is not output-identical —
 * the rewrite into `cn()` is the author's call.
 */
export const astroNoClassList: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'disallow astro `class:list` in favour of `class` with `cn()`' },
    schema: [],
    messages: {
      classList: 'no `class:list` — use `class` with `cn()` instead',
    },
  },
  create(context) {
    const checkAttribute = (node: AnyNode): void => {
      if (isClassList(node)) {
        context.report({ node: node.name as never, messageId: 'classList' });
      }
    };

    return {
      JSXAttribute: checkAttribute,
      // the template-literal form `class:list=`a ${x}`` is its own node type
      AstroTemplateLiteralAttribute: checkAttribute,
    };
  },
};
