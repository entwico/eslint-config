import type { Rule } from 'eslint';

type AnyNode = { type: string } & Record<string, any>;

type Options = {
  allowProperties?: string[] | undefined;
  allowCustomProperties?: boolean | undefined;
};

/** Values a class could express: literals, quote-only templates, and ternaries between them. */
function isStatic(node: AnyNode | null | undefined): boolean {
  if (!node) {
    return false;
  }

  switch (node.type) {
    case 'Literal': {
      return true;
    }
    case 'TemplateLiteral': {
      return node.expressions.length === 0;
    }
    case 'ConditionalExpression': {
      return isStatic(node.consequent) && isStatic(node.alternate);
    }
    case 'UnaryExpression': {
      return (node.operator === '-' || node.operator === '+') && isStatic(node.argument);
    }
    default: {
      return false;
    }
  }
}

function propertyName(key: AnyNode, computed: boolean): string | undefined {
  if (computed) {
    return undefined;
  }

  if (key.type === 'Identifier') {
    return key.name as string;
  }

  if (key.type === 'Literal' && typeof key.value === 'string') {
    return key.value;
  }

  return undefined;
}

function kebabCase(name: string): string {
  return name.replaceAll(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase();
}

/** Tailwind's arbitrary-property escape hatch, when the value survives class syntax. */
function arbitraryProperty(name: string, value: AnyNode): string | undefined {
  const raw = value.type === 'Literal' && typeof value.value === 'string'
    ? value.value
    : (value.type === 'TemplateLiteral' && value.expressions.length === 0
        ? (value.quasis[0].value.cooked as string)
        : undefined);

  if (raw === undefined || raw === '' || /["'\\[\]{};]/.test(raw)) {
    return undefined;
  }

  return `[${kebabCase(name)}:${raw.trim().replaceAll(/\s+/g, '_')}]`;
}

/**
 * Forbid statically-valued inline styles in favour of Tailwind classes.
 *
 * Only fires on values a class could have expressed — computed values, spreads and
 * CSS custom properties (the sanctioned way to pass dynamic values into Tailwind)
 * are left alone, so the rule never blocks genuinely dynamic styling.
 */
export const noInlineStyle: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'disallow static inline styles in favour of tailwind classes' },
    schema: [
      {
        type: 'object',
        properties: {
          allowProperties: { type: 'array', items: { type: 'string' } },
          allowCustomProperties: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      attribute: 'avoid the inline `style` attribute — use tailwind classes',
      property: 'avoid the inline style `{{property}}` — use a tailwind class',
      propertyHint: 'avoid the inline style `{{property}}` — use a tailwind class (e.g. `{{suggestion}}`)',
    },
  },
  create(context) {
    const { allowProperties = [], allowCustomProperties = true } = (context.options[0] ?? {}) as Options;
    const allowed = new Set(allowProperties.flatMap((name) => [name, kebabCase(name)]));

    return {
      JSXAttribute(node: AnyNode) {
        if (node.name?.type !== 'JSXIdentifier' || node.name.name !== 'style') {
          return;
        }

        const value = node.value as AnyNode | null;

        // `style="color: red"` — the astro/html form
        if (value?.type === 'Literal' || value?.type === 'JSXText') {
          if (typeof value.value === 'string' && value.value.trim() !== '') {
            context.report({ node: node as never, messageId: 'attribute' });
          }

          return;
        }

        if (value?.type !== 'JSXExpressionContainer' || value.expression?.type !== 'ObjectExpression') {
          return;
        }

        for (const property of value.expression.properties as AnyNode[]) {
          if (property.type !== 'Property') {
            continue;
          }

          const name = propertyName(property.key as AnyNode, property.computed as boolean);

          if (name === undefined || allowed.has(name) || allowed.has(kebabCase(name))) {
            continue;
          }

          if (allowCustomProperties && name.startsWith('--')) {
            continue;
          }

          if (!isStatic(property.value as AnyNode)) {
            continue;
          }

          const suggestion = arbitraryProperty(name, property.value as AnyNode);

          context.report({
            node: property as never,
            ...(suggestion
              ? { messageId: 'propertyHint', data: { property: name, suggestion } }
              : { messageId: 'property', data: { property: name } }),
          });
        }
      },
    };
  },
};
