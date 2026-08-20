# @entwico/eslint-config

## 4.0.1

### Patch Changes

- babb207: `tailwind-prefer-reference` no longer asks stylesheets the tailwind entry `@import`s to `@reference` it back — that fixed the build into a recursion error; `tailwind-prefer-apply` now covers those files instead

## 4.0.0

### Major Changes

- c524186: `css/use-baseline` is disabled and the `css.baseline` option is removed
- 919e184: a11y is now powered by `eslint-plugin-jsx-a11y-x`; the `'eslint-plugin-jsx-a11y>eslint': '10'` allowedVersions workaround can be removed from consumer `pnpm-workspace.yaml`s

### Minor Changes

- e942d1a: new `@entwico/tailwind-prefer-apply` rule: raw declarations are reported in stylesheets where `@apply` can resolve (the Tailwind entry and `@reference`-d files), with an autofix to the output-identical arbitrary-property class that `enforce-canonical-classes` then upgrades to named utilities in the same `--fix` run
- e942d1a: new `@entwico/tailwind-apply-once` rule: multiple `@apply` at-rules in one block are reported; consecutive runs autofix into a single `@apply`
- e942d1a: new `@entwico/tailwind-prefer-reference` rule: stylesheets with class-expressible styling but no `@reference`/entry import are asked to reference the tailwind entry (once per file), with an autofix inserting `@reference` with the correct relative path

### Patch Changes

- c524186: stop reporting `@apply` preludes with arbitrary values, slash modifiers, or the var shorthand as invalid at-rules
- e942d1a: at-rule preludes containing `var()`/`env()` (e.g. `@apply [color:var(--x)]`) no longer crash `css/no-invalid-at-rules`

## 3.0.0

### Major Changes

- bfa0a9f: presets load their plugins only when enabled

### Minor Changes

- e90315c: flag bidi control characters, ReDoS-prone regexes and eval-style code
- 1fe7dc8: new `css` option lints stylesheets — general CSS correctness, plus Tailwind classes inside `@apply` when Tailwind is configured

### Patch Changes

- b61b397: allow `<style define:vars>` blocks in Astro

## 2.4.0

### Minor Changes

- 0489c0c: flag `<style>` blocks in Tailwind projects

## 2.3.0

### Minor Changes

- 1f80bce: flag static inline styles in Tailwind projects
- 92f4c2f: ban re-exports; library entry points can opt out via `imports: { noReexport: { allow: [...] } }`

## 2.2.1

### Patch Changes

- 2b5b99d: lint .astro through the forked parser

## 2.2.0

### Minor Changes

- 0f10dd4: lint .astro files through the typescript-eslint project service (faster type-aware linting, types resolve across .astro imports)
- 8e3087f: update bundled eslint-plugin-unicorn to 72 (new recommended rules, incl. prefer-group-by, prefer-iterator-helpers, prefer-then-catch, no-useless-re-export)

## 2.1.0

### Minor Changes

- b5dbfc1: update bundled plugins: eslint-plugin-astro 3, @astroscope/eslint-plugin 1.1

## 2.0.8

### Patch Changes

- e140212: enforce all `@astroscope/i18n` recommended rules as errors, including `t-static-meta`, which was silently disabled

## 2.0.7

### Patch Changes

- f88ce72: pin all bundled plugin dependencies to exact versions for reproducible installs

## 2.0.6

### Patch Changes

- 21c0bc9: no-excess-jsx-props no longer reports false excess props on discriminated unions with a union-of-literals discriminant

## 2.0.5

### Patch Changes

- 35dc392: fix `@stylistic/max-len` flagging `eslint-disable`/`eslint-enable` directive lines

## 2.0.4

### Patch Changes

- 390e259: disable `unicorn/no-top-level-side-effects`, `unicorn/no-top-level-assignment-in-function`, and `unicorn/no-process-exit`

## 2.0.3

### Patch Changes

- d80f153: Tailwind rules now properly lint classes inside `cn`/`cva`/`clsx` object keys and values (e.g. `cn({ 'px-2 flex': cond })`)

## 2.0.2

### Patch Changes

- dfa1e4f: disable `unicorn/max-nested-calls` because of zod conflicts

## 2.0.1

### Patch Changes

- 3c4dde5: fix Astro inline scripts crash

## 2.0.0

### Major Changes

- 01b0a87: Astro linting moves to `eslint-plugin-astro` 2 (ESM-only, Node 22+) with `@astroscope/eslint-plugin` 0.4.
- 01b0a87: React linting is now powered by `@eslint-react/eslint-plugin`, replacing `eslint-plugin-react` and `eslint-plugin-react-hooks`. React rule IDs change from `react/*` and `react-hooks/*` to `@eslint-react/*`, and the `react.reactCompiler` option is removed.
- 01b0a87: Require ESLint 10. The `eslint` peer dependency is now `^10`.

### Minor Changes

- 01b0a87: `prefer-read-only-props` is no longer enforced on React components — the new React toolchain has no equivalent.
- 5c38712: upgrade `eslint-plugin-unicorn` to v69 — more recommended rules now fire (e.g. `prefer-observer-apis`, `require-array-sort-compare`, `no-computed-property-existence-check`). The opinionated naming rules stay off: `name-replacements` (renamed from `prevent-abbreviations`), `no-for-each` (renamed from `no-array-for-each`), and `consistent-boolean-name`.

### Patch Changes

- 01b0a87: on pnpm + ESLint 10, `eslint-plugin-jsx-a11y` prints a harmless peer warning; silence it with a `peerDependencyRules` entry until upstream widens its eslint range.

## 1.7.1

### Patch Changes

- 05a4e1f: stop flagging JSX/Astro expression comments (`{/* ... */}`) for a missing leading space

## 1.7.0

### Minor Changes

- a80dfdb: enforce read-only React props (`react/prefer-read-only-props`, auto-fixable), and lint hydrated Astro islands for mutable or non-serializable props and stray `client:*` directives on Astro components. Also updates bundled plugins (eslint-plugin-unicorn 65, typescript-eslint 8.61, @astroscope/eslint-plugin 0.3).
- 00c97ae: enforce a space between code and a trailing comment (auto-fixable)

### Patch Changes

- a80dfdb: type-aware `@astroscope` rules (e.g. `no-excess-jsx-props`) now run on `.astro` files — they were silently skipped before for lack of type info

## 1.6.0

### Minor Changes

- b4d972c: update bundled plugins (@astroscope/eslint-plugin 0.2, @eslint/json 2, typescript-eslint 8.60)

## 1.5.0

### Minor Changes

- 5b74dfe: require `window.*` instead of bare references for confusing browser globals (`location`, `event`, `name`, `history`, `top`, …)
- 70eb270: promote warnings to errors (replicate `--max-warnings 0` behavior) and enable `reportUnusedDisableDirectives`

## 1.4.2

### Patch Changes

- e7abd17: disable prefer-global-this

## 1.4.1

### Patch Changes

- ef54d33: stop flagging top-level `return` in Astro frontmatter

## 1.4.0

### Minor Changes

- fc0b943: enable `eslint-plugin-unicorn` recommended rules

## 1.3.0

### Minor Changes

- 2530b7e: auto-detect React Compiler to turn on its eslint lints

## 1.2.0

### Minor Changes

- 92c02c4: auto-discover the right tsconfig for type-aware rules in monorepo setups, add tsconfigProject config parameter

## 1.1.1

### Patch Changes

- 082767e: enforce prefer-template in .astro files

## 1.1.0

### Minor Changes

- 2f13052: inline customization for react and astro presets, 120 max line length, misc formatting tweaks

## 1.0.0

### Major Changes

- 657d588: init
