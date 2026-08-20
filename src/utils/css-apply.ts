import type { Rule } from 'eslint';

export type CssNode = { type: string } & Record<string, any>;

/** Grouping at-rules whose declarations are still ordinary rule styling. */
const GROUPING_AT_RULES = new Set(['media', 'supports', 'layer', 'container', 'scope', 'utility']);

/** The at-rules that make `@apply` resolvable in a file. */
export function enablesApply(node: CssNode, sourceCode: Rule.RuleContext['sourceCode']): boolean {
  const name = String(node.name).toLowerCase();

  if (name === 'reference') {
    return true;
  }

  if (name !== 'import' || !node.prelude) {
    return false;
  }

  return /^["']tailwindcss/.test((sourceCode.getText(node.prelude as never) ?? '').trim());
}

/**
 * Whether a declaration is ordinary styling a class could express: not a
 * custom property, and every at-rule ancestor is a grouping rule — descriptor
 * contexts (`@keyframes`, `@font-face`, `@theme`, …) and unknown at-rules
 * disqualify.
 */
export function isExpressibleDeclaration(node: CssNode, ancestors: CssNode[]): boolean {
  if (String(node.property).toLowerCase().startsWith('--')) {
    return false;
  }

  return ancestors.every(
    (ancestor) => ancestor.type !== 'Atrule' || GROUPING_AT_RULES.has(String(ancestor.name).toLowerCase()),
  );
}
