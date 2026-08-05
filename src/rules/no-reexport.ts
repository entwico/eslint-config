import type { Rule } from 'eslint';

type AnyNode = { type: string } & Record<string, any>;

type Options = {
  allowTypes?: boolean | undefined;
};

type ImportedBinding = {
  /** The name to import at the source — not the local one, which a rename may have changed. */
  name: string;
  source: string;
};

/**
 * Forbid re-exporting another module's symbols.
 *
 * Re-exports hide where a symbol actually lives: the import site points at a file
 * that merely forwards, so moving code leaves a permanent layer of indirection and
 * barrels drag unrelated modules into every consumer's graph. Import from the source.
 *
 * Library entry points are the one legitimate barrel — turn the rule off for those
 * files (`imports: { noReexport: { allow: ['src/index.ts'] } }`).
 */
export const noReexport: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'disallow re-exporting symbols from another module' },
    schema: [
      {
        type: 'object',
        properties: {
          allowTypes: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      reexport: 'no re-exports — import `{{name}}` from `{{source}}` directly',
      reexportAll: 'no re-exports — `export *` hides where `{{source}}`\'s symbols come from',
      indirect: 'no re-exports — `{{name}}` is imported from `{{source}}`, import it from there directly',
    },
  },
  create(context) {
    const { allowTypes = false } = (context.options[0] ?? {}) as Options;

    /** Local binding name → where it came in from, so the indirect form can name its source too. */
    function collectImported(statement: AnyNode, imported: Map<string, ImportedBinding>): void {
      const isTypeImport = statement.importKind === 'type';
      const source = statement.source.value as string;

      for (const specifier of statement.specifiers as AnyNode[]) {
        if (allowTypes && (isTypeImport || specifier.importKind === 'type')) {
          continue;
        }

        // the name to import at the source, which a rename made differ from the local one
        const name = specifier.type === 'ImportSpecifier'
          ? ((specifier.imported.name ?? specifier.imported.value) as string)
          : (specifier.local.name as string);

        imported.set(specifier.local.name as string, { name, source });
      }
    }

    function reportSpecifiers(statement: AnyNode, imported: Map<string, ImportedBinding>): void {
      const isTypeExport = statement.exportKind === 'type';

      for (const specifier of statement.specifiers as AnyNode[]) {
        if (allowTypes && (isTypeExport || specifier.exportKind === 'type')) {
          continue;
        }

        const name = (specifier.local.name ?? specifier.local.value) as string;

        if (statement.source) {
          context.report({
            node: specifier as never,
            messageId: 'reexport',
            data: { name, source: statement.source.value as string },
          });

          continue;
        }

        // `import { a } from './a'; export { a };` — the same forwarding, spelled out
        const binding = imported.get(name);

        if (binding) {
          context.report({
            node: specifier as never,
            messageId: 'indirect',
            data: { name: binding.name, source: binding.source },
          });
        }
      }
    }

    return {
      Program(node: AnyNode) {
        const imported = new Map<string, ImportedBinding>();

        for (const statement of node.body as AnyNode[]) {
          if (statement.type === 'ImportDeclaration') {
            collectImported(statement, imported);
            continue;
          }

          if (statement.type === 'ExportAllDeclaration') {
            if (!allowTypes || statement.exportKind !== 'type') {
              context.report({
                node: statement as never,
                messageId: 'reexportAll',
                data: { source: statement.source.value as string },
              });
            }

            continue;
          }

          if (statement.type === 'ExportNamedDeclaration' && !statement.declaration) {
            reportSpecifiers(statement, imported);
          }
        }
      },
    };
  },
};
