---
'@entwico/eslint-config': minor
---

new `@entwico/tailwind-prefer-apply` rule: raw declarations are reported in stylesheets where `@apply` can resolve (the Tailwind entry and `@reference`-d files), with an autofix to the output-identical arbitrary-property class that `enforce-canonical-classes` then upgrades to named utilities in the same `--fix` run
