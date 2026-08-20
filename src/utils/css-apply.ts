import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

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

const IMPORT_PATTERN = /@import\s+(?:url\(\s*)?["']([^"']+)["']/gu;

type ImportGraph = { files: Set<string>; stamps: Map<string, number> };

const graphCache = new Map<string, ImportGraph>();

function stampOf(file: string): number {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return -1;
  }
}

/** Resolved targets of the relative `@import`s in one stylesheet. */
function importsOf(file: string, text: string): string[] {
  const targets: string[] = [];

  for (const [, specifier] of text.matchAll(IMPORT_PATTERN)) {
    // bare specifiers resolve into node_modules, which is never linted
    if (!specifier?.startsWith('.')) {
      continue;
    }

    const target = resolve(dirname(file), specifier);

    targets.push(existsSync(target) ? target : `${target}.css`);
  }

  return targets;
}

function crawl(entry: string): ImportGraph {
  const files = new Set<string>();
  const stamps = new Map<string, number>();
  const queue = [entry];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (files.has(current)) {
      continue;
    }

    files.add(current);
    stamps.set(current, stampOf(current));

    let text: string;

    try {
      text = readFileSync(current, 'utf8');
    } catch {
      continue;
    }

    queue.push(...importsOf(current, text));
  }

  return { files, stamps };
}

/**
 * Absolute paths of the stylesheets reachable from the Tailwind entry through
 * `@import`. Tailwind compiles that whole tree as one unit, so `@apply` already
 * resolves in every one of them — and adding `@reference` back to the entry
 * makes the build fail with a recursion error.
 */
export function tailwindImportGraph(entryPoint: string, root: string): Set<string> {
  const entry = resolve(root, entryPoint);
  const cached = graphCache.get(entry);

  if (cached && [...cached.stamps].every(([file, stamp]) => stampOf(file) === stamp)) {
    return cached.files;
  }

  const graph = crawl(entry);

  graphCache.set(entry, graph);

  return graph.files;
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
