import type { Rule } from 'eslint';

/**
 * Embedding, override and isolate controls — the Trojan Source (CVE-2021-42574) vectors.
 * These reorder whole runs of text, so what a reviewer reads can differ from what the
 * compiler sees.
 */
const REORDERING: Record<number, string> = {
  0x20_2A: 'U+202A LEFT-TO-RIGHT EMBEDDING',
  0x20_2B: 'U+202B RIGHT-TO-LEFT EMBEDDING',
  0x20_2C: 'U+202C POP DIRECTIONAL FORMATTING',
  0x20_2D: 'U+202D LEFT-TO-RIGHT OVERRIDE',
  0x20_2E: 'U+202E RIGHT-TO-LEFT OVERRIDE',
  0x20_66: 'U+2066 LEFT-TO-RIGHT ISOLATE',
  0x20_67: 'U+2067 RIGHT-TO-LEFT ISOLATE',
  0x20_68: 'U+2068 FIRST STRONG ISOLATE',
  0x20_69: 'U+2069 POP DIRECTIONAL ISOLATE',
};

/** Directional marks. Weaker — they only nudge adjacent weak characters, and they occur
 * legitimately inside RTL string content, so `allowMarks` can drop them. */
const MARKS: Record<number, string> = {
  0x06_1C: 'U+061C ARABIC LETTER MARK',
  0x20_0E: 'U+200E LEFT-TO-RIGHT MARK',
  0x20_0F: 'U+200F RIGHT-TO-LEFT MARK',
};

const ALL: Record<number, string> = { ...REORDERING, ...MARKS };

/**
 * Derive the scanner from code points, so no raw control character ever appears in this
 * file. Embedding them here would make this source render deceptively in every editor and
 * diff view — the exact failure the rule exists to prevent, and one that an
 * `eslint-disable` would hide rather than fix.
 */
function scannerFor(names: Record<number, string>): RegExp {
  const escapes = Object.keys(names).map((code) => String.raw`\u${Number(code).toString(16).padStart(4, '0')}`);

  return new RegExp(`[${escapes.join('')}]`, 'gu');
}

const REORDERING_SCANNER = scannerFor(REORDERING);
const ALL_SCANNER = scannerFor(ALL);

type Options = { allowMarks?: boolean | undefined };

/**
 * Disallow raw Unicode bidirectional control characters in source.
 *
 * A Trojan Source attack hides code behind a directional override: the file renders as one
 * thing everywhere a human looks at it, and compiles as another. Escaped forms are
 * deliberately untouched — an escape is visible to the reader, which is the whole point, so
 * escaping is the fix rather than deletion.
 *
 * Scans the raw file text rather than tokens, so comments, string content, identifiers and
 * JSX/Astro template text are all covered, and the rule does not depend on the parser
 * populating `Program.tokens`.
 *
 * No autofix: deleting the character silently changes the rendering of legitimate RTL text,
 * and escaping it only preserves meaning inside a string literal. A human decides.
 */
export const noBidiCharacters: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'disallow unicode bidirectional control characters (trojan source)' },
    schema: [
      {
        type: 'object',
        properties: { allowMarks: { type: 'boolean' } },
        additionalProperties: false,
      },
    ],
    messages: {
      bidi: String.raw`unexpected bidirectional control character {{name}} — write it as a \u escape if it is intentional`,
    },
  },
  create(context) {
    const [{ allowMarks = false } = {}] = context.options as [Options?];
    const scanner = allowMarks ? REORDERING_SCANNER : ALL_SCANNER;
    const names = allowMarks ? REORDERING : ALL;

    return {
      Program() {
        const sourceCode = context.sourceCode;
        const text = sourceCode.getText();

        scanner.lastIndex = 0;

        let match: RegExpExecArray | null;

        while ((match = scanner.exec(text)) !== null) {
          const code = match[0].codePointAt(0) ?? 0;

          context.report({
            loc: {
              start: sourceCode.getLocFromIndex(match.index),
              end: sourceCode.getLocFromIndex(match.index + match[0].length),
            },
            messageId: 'bidi',
            data: { name: names[code] ?? 'bidi control' },
          });
        }
      },
    };
  },
};
