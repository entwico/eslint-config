---
"@entwico/eslint-config": patch
---

type-aware `@astroscope` rules (e.g. `no-excess-jsx-props`) now run on `.astro` files — they were silently skipped before for lack of type info
