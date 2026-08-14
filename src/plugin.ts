import { noBidiCharacters } from './rules/no-bidi-characters.js';
import { noInlineStyle } from './rules/no-inline-style.js';
import { noReexport } from './rules/no-reexport.js';
import { noStyleTag } from './rules/no-style-tag.js';
import { noUnsafeRegex } from './rules/no-unsafe-regex.js';
import { spaceBeforeComment } from './rules/space-before-comment.js';

/**
 * The `@entwico` plugin holding this package's local rules.
 *
 * Shared as a single object: flat config rejects the same plugin name being
 * defined twice with different objects, and it is registered by two presets.
 */
export const entwicoPlugin = {
  rules: {
    'space-before-comment': spaceBeforeComment,
    'no-bidi-characters': noBidiCharacters,
    'no-inline-style': noInlineStyle,
    'no-reexport': noReexport,
    'no-style-tag': noStyleTag,
    'no-unsafe-regex': noUnsafeRegex,
  },
};
