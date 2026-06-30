---
"@entwico/eslint-config": patch
---

Tailwind rules now properly lint classes inside `cn`/`cva`/`clsx` object keys and values (e.g. `cn({ 'px-2 flex': cond })`)
