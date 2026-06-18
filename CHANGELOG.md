# @entwico/eslint-config

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
