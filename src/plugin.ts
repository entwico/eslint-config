import { noInlineStyle } from './rules/no-inline-style.js';
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
    'no-inline-style': noInlineStyle,
  },
};
