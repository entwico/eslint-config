import { dirname, isAbsolute, relative, resolve } from 'node:path';

import type { Rule } from 'eslint';

import { type CssNode, enablesApply, isExpressibleDeclaration } from '../utils/css-apply.js';

type Options = {
  entryPoint?: string | undefined;
  root?: string | undefined;
};

/** The `@reference` path from the linted file to the entry, POSIX-style. */
function referencePath(filename: string, entryPoint: string, root: string): string | undefined {
  if (!isAbsolute(filename)) {
    return undefined;
  }

  const path = relative(dirname(filename), resolve(root, entryPoint)).replaceAll('\\', '/');

  return path.startsWith('.') ? path : `./${path}`;
}

/**
 * Stylesheets that style raw but cannot resolve `@apply` should `@reference`
 * the Tailwind entry — that is what lets `@entwico/tailwind-prefer-apply`
 * (and the design-system tokens) reach them.
 *
 * Reports once per file, so a deliberately plain stylesheet is excused with a
 * single file-level `eslint-disable` comment. Files with nothing a class
 * could express (keyframes, token definitions, import aggregators) are never
 * reported.
 */
export const tailwindPreferReference: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: { description: 'require @reference (or the tailwind entry import) in stylesheets that contain class-expressible styling' },
    schema: [
      {
        type: 'object',
        properties: {
          entryPoint: { type: 'string' },
          root: { type: 'string' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingReference: 'this stylesheet cannot resolve `@apply` — add `@reference` to the tailwind entry ({{entryPoint}}), or mark the file deliberately plain with a file-level eslint-disable',
    },
  },
  create(context) {
    const { entryPoint, root } = (context.options[0] ?? {}) as Options;
    const { sourceCode } = context;

    let applyResolvable = false;
    let firstExpressible: CssNode | undefined;

    return {
      Atrule(node: CssNode) {
        if (!applyResolvable && enablesApply(node, sourceCode)) {
          applyResolvable = true;
        }
      },

      Declaration(node: CssNode) {
        if (firstExpressible) {
          return;
        }

        const ancestors = sourceCode.getAncestors(node as never) as unknown as CssNode[];

        if (isExpressibleDeclaration(node, ancestors)) {
          firstExpressible = node;
        }
      },

      'StyleSheet:exit'() {
        if (applyResolvable || !firstExpressible) {
          return;
        }

        const path = entryPoint
          ? referencePath(context.filename, entryPoint, root ?? process.cwd())
          : undefined;

        context.report({
          node: firstExpressible as never,
          messageId: 'missingReference',
          data: { entryPoint: entryPoint ?? 'the tailwind entry css' },
          ...(path && {
            fix: (fixer: Rule.RuleFixer) => fixer.insertTextBeforeRange([0, 0], `@reference "${path}";\n\n`),
          }),
        });
      },
    };
  },
};
