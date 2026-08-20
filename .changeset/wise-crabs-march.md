---
"@entwico/eslint-config": minor
---

new `@entwico/tailwind-prefer-reference` rule: stylesheets with class-expressible styling but no `@reference`/entry import are asked to reference the tailwind entry (once per file), with an autofix inserting `@reference` with the correct relative path
