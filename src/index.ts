// factory (recommended entry point)
export { defineConfig, type DefineConfigOptions } from './define-config.js';

// shared constants
export { DEFAULT_IGNORES, JS_TS_FILES } from './files.js';

// individual presets (escape hatches for advanced usage)
export { astro, type AstroOptions } from './presets/astro.js';
export { base, type BaseOptions } from './presets/base.js';
export { imports, type ImportsOptions } from './presets/imports.js';
export { json, type JsonOptions } from './presets/json.js';
export { react, type ReactOptions } from './presets/react.js';
export { stylistic, type StylisticOptions } from './presets/stylistic.js';
export { tailwind, type TailwindOptions } from './presets/tailwind.js';
