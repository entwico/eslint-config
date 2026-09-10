import type { AST, Rule } from 'eslint';

type AnyNode = { type: string; range: [number, number]; loc: AST.SourceLocation } & Record<string, any>;

type Guard = {
  /** The expression container wrapping the whole template. */
  container: AnyNode;
  /** The `&&` / `?:` expression inside it. */
  expression: AnyNode;
  /** The condition that decides whether anything renders. */
  condition: AnyNode;
  /** True when the template renders on a truthy condition (`cond && …`, `cond ? … : null`). */
  rendersWhenTruthy: boolean;
  /** What renders when the guard passes. */
  content: AnyNode;
};

const FENCE = '---';

const INVERTED_OPERATORS = new Map([
  ['===', '!=='],
  ['!==', '==='],
  ['==', '!='],
  ['!=', '=='],
]);

// operand shapes that bind tighter than `!`, so `!x` needs no parentheses
const UNARY_SAFE_TYPES = new Set([
  'Identifier',
  'MemberExpression',
  'CallExpression',
  'ChainExpression',
  'Literal',
  'TemplateLiteral',
  'ThisExpression',
  'NewExpression',
  'ArrayExpression',
  'ObjectExpression',
  'UnaryExpression',
]);

/** Whitespace and comment-only expression containers render nothing and do not count as a template root. */
function isBlank(node: AnyNode): boolean {
  if (node.type === 'JSXExpressionContainer') {
    return (node.expression as AnyNode).type === 'JSXEmptyExpression';
  }

  return node.type === 'JSXText' && typeof node.value === 'string' && node.value.trim() === '';
}

/** `null`, `undefined`, `false` and `''` all render as nothing. */
function rendersNothing(node: AnyNode): boolean {
  if (node.type === 'Identifier') {
    return node.name === 'undefined';
  }

  return node.type === 'Literal' && [null, false, ''].includes(node.value);
}

/**
 * A file under `pages/` is a route unless a segment below `pages` starts with `_`,
 * which is astro's marker for non-routable files and folders living there.
 */
function isPage(filename: string): boolean {
  const segments = filename.split(/[/\\]/);
  const pagesIndex = segments.indexOf('pages');

  if (pagesIndex === -1) {
    return false;
  }

  return segments.slice(pagesIndex + 1).every((segment) => !segment.startsWith('_'));
}

function isMarkup(node: AnyNode): boolean {
  return node.type === 'JSXElement' || node.type === 'JSXFragment';
}

function findGuard(program: AnyNode): Guard | undefined {
  const fragment = (program.body as AnyNode[]).find((node) => node.type === 'AstroFragment');
  const roots = ((fragment?.children ?? []) as AnyNode[]).filter((node) => !isBlank(node));

  if (roots.length !== 1) {
    return undefined;
  }

  const container = roots[0]!;

  if (container.type !== 'JSXExpressionContainer') {
    return undefined;
  }

  const expression = container.expression as AnyNode;

  if (expression.type === 'LogicalExpression' && expression.operator === '&&') {
    return {
      container,
      expression,
      condition: expression.left as AnyNode,
      rendersWhenTruthy: true,
      content: expression.right as AnyNode,
    };
  }

  if (expression.type === 'ConditionalExpression') {
    const consequent = expression.consequent as AnyNode;
    const alternate = expression.alternate as AnyNode;
    const condition = expression.test as AnyNode;

    if (rendersNothing(alternate)) {
      return { container, expression, condition, rendersWhenTruthy: true, content: consequent };
    }

    if (rendersNothing(consequent)) {
      return { container, expression, condition, rendersWhenTruthy: false, content: alternate };
    }
  }

  return undefined;
}

function negate(condition: AnyNode, sourceCode: Rule.RuleContext['sourceCode']): string {
  const text = sourceCode.getText(condition as never);

  if (condition.type === 'UnaryExpression' && condition.operator === '!') {
    return sourceCode.getText(condition.argument as never);
  }

  const invertedOperator = condition.type === 'BinaryExpression' ? INVERTED_OPERATORS.get(condition.operator as string) : undefined;

  if (invertedOperator) {
    const left = sourceCode.getText(condition.left as never);
    const right = sourceCode.getText(condition.right as never);

    return `${left} ${invertedOperator} ${right}`;
  }

  return UNARY_SAFE_TYPES.has(condition.type) ? `!${text}` : `!(${text})`;
}

/** Re-indents a node's text so its first line lands at `targetColumn` instead of where it was. */
function shiftIndent(node: AnyNode, text: string, targetColumn: number): string {
  const shift = node.loc.start.column - targetColumn;

  if (shift <= 0) {
    return text;
  }

  return text
    .split('\n')
    .map((line, index) => {
      if (index === 0) {
        return line;
      }

      const leading = line.length - line.trimStart().length;

      return line.slice(Math.min(leading, shift));
    })
    .join('\n');
}

/**
 * Prefer a frontmatter early return over wrapping the whole template in a guard.
 *
 * `{cond && (<Root>…</Root>)}` around everything a component renders is a
 * condition in the wrong place: the frontmatter already computed what the
 * template needs, so an `if (!cond) return;` there reads top-down, spares the
 * work below it, and hands the template one less level of indentation. A bare
 * `return` in a component's frontmatter renders nothing — the exact output of
 * the `&&` / `?: null` it replaces — so the autofix is output-identical.
 *
 * Pages are the exception: Astro requires a page's frontmatter to return a
 * `Response` if it returns at all, so routes under `pages/` are skipped —
 * `_`-prefixed files and folders there are components and still get the rule.
 * Only the shape where the guard is the sole template root qualifies —
 * a sibling `<script>` or a second expression would change what renders.
 */
export const astroPreferEarlyReturn: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'prefer a frontmatter early return over guarding the whole astro template' },
    fixable: 'code',
    schema: [],
    messages: {
      earlyReturn: 'guard the whole template in the frontmatter instead: `if ({{guard}}) return;`',
    },
  },
  create(context) {
    const { sourceCode } = context;

    if (isPage(context.filename)) {
      return {};
    }

    return {
      Program(program) {
        const guard = findGuard(program as unknown as AnyNode);

        if (!guard) {
          return;
        }

        const { container, expression, condition, rendersWhenTruthy, content } = guard;
        const guardText = rendersWhenTruthy ? negate(condition, sourceCode) : sourceCode.getText(condition as never);
        const guardStatement = `if (${guardText}) {\n  return;\n}`;

        context.report({
          node: container as never,
          messageId: 'earlyReturn',
          data: { guard: guardText },
          fix(fixer) {
            const body = program.body as unknown as AnyNode[];
            const lastStatement = body.findLast((node) => node.type !== 'AstroFragment');
            const closingFence = sourceCode.ast.tokens
              .filter((token) => token.type === 'Punctuator' && token.value === FENCE && token.range[1] <= container.range[0])
              .at(1);
            const contentText = sourceCode.getText(content as never);

            const insertGuard = lastStatement
              ? fixer.insertTextAfterRange(lastStatement.range, `\n\n${guardStatement}`)
              : (closingFence
                  ? fixer.insertTextBeforeRange(closingFence.range, `${guardStatement}\n`)
                  : fixer.insertTextBeforeRange([0, 0], `${FENCE}\n${guardStatement}\n${FENCE}\n\n`));

            // markup becomes the template root itself; anything else keeps its braces
            const unwrap = isMarkup(content)
              ? fixer.replaceTextRange(container.range, shiftIndent(content, contentText, 0))
              : fixer.replaceTextRange(
                  expression.range,
                  shiftIndent(content, contentText, expression.loc.start.column),
                );

            return [insertGuard, unwrap];
          },
        });
      },
    };
  },
};
