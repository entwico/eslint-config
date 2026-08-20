import type { Rule } from 'eslint';

import { type CssNode, enablesApply, isExpressibleDeclaration } from '../utils/css-apply.js';

type Options = {
  allowProperties?: string[] | undefined;
};

/**
 * Tailwind's arbitrary-property class, when the value survives class syntax.
 * A literal `_` bails: in candidates it decodes back to a space.
 */
function arbitraryProperty(property: string, value: string, important: boolean): string | undefined {
  if (value === '' || /["'\\[\]{};_]/.test(value)) {
    return undefined;
  }

  return `[${property}:${value.replaceAll(/\s+/g, '_')}]${important ? '!' : ''}`;
}

/**
 * Prefer `@apply` over raw declarations in stylesheets where Tailwind is
 * reachable — the entry (`@import "tailwindcss"`) and `@reference`-d files.
 *
 * A file with neither marker cannot resolve `@apply`, so raw declarations are
 * its only form and the rule stays silent. Custom properties and descriptor
 * contexts (`@keyframes`, `@font-face`, `@theme`, …) are never reported: no
 * class can express them.
 */
export const tailwindPreferApply: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: { description: 'prefer @apply with tailwind classes over raw declarations where @apply is resolvable' },
    schema: [
      {
        type: 'object',
        properties: {
          allowProperties: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      declaration: 'prefer `@apply` over the raw `{{property}}` declaration',
      declarationHint: 'prefer `@apply` over the raw `{{property}}` declaration (e.g. `@apply {{suggestion}}`)',
    },
  },
  create(context) {
    const { allowProperties = [] } = (context.options[0] ?? {}) as Options;
    const allowed = new Set(allowProperties.map((name) => name.toLowerCase()));
    const { sourceCode } = context;

    let applyResolvable = false;

    return {
      Atrule(node: CssNode) {
        if (!applyResolvable && enablesApply(node, sourceCode)) {
          applyResolvable = true;
        }
      },

      Declaration(node: CssNode) {
        if (!applyResolvable) {
          return;
        }

        const property = String(node.property).toLowerCase();

        if (allowed.has(property)) {
          return;
        }

        const ancestors = sourceCode.getAncestors(node as never) as unknown as CssNode[];

        if (!isExpressibleDeclaration(node, ancestors)) {
          return;
        }

        const value = node.value ? sourceCode.getText(node.value as never).trim() : '';
        const suggestion = arbitraryProperty(property, value, Boolean(node.important));

        context.report({
          node: node as never,
          ...(suggestion
            ? {
                messageId: 'declarationHint',
                data: { property, suggestion },
                // the arbitrary-property form is output-identical by
                // construction; enforce-canonical-classes then upgrades it to
                // the named utility in the same --fix run
                fix: (fixer) => fixer.replaceText(node as never, `@apply ${suggestion}`),
              }
            : { messageId: 'declaration', data: { property } }),
        });
      },
    };
  },
};
