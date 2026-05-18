# @entwico/eslint-config

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
