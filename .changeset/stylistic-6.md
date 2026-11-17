---
'@entwico/eslint-config': patch
---

update `@stylistic/eslint-plugin` to 6.0.1: `indent` now checks `satisfies` expressions, so a ternary branch ending in `} satisfies T` gets the same indentation as one ending in `as T` (auto-fixable), and `max-statements-per-line` can auto-fix
