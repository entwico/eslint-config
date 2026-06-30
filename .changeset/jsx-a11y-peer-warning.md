---
"@entwico/eslint-config": patch
---

on pnpm + ESLint 10, `eslint-plugin-jsx-a11y` prints a harmless peer warning; silence it with a `peerDependencyRules` entry until upstream widens its eslint range.
