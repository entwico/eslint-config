---
'@entwico/eslint-config': patch
---

`tailwind-prefer-reference` no longer asks stylesheets the tailwind entry `@import`s to `@reference` it back — that fixed the build into a recursion error; `tailwind-prefer-apply` now covers those files instead
