import type { ESLint, Linter, Rule } from 'eslint';

// the fork's auto-generated declarations only expose `configs`; the runtime object
// also carries `meta` and `rules`
type A11yBasePlugin = {
  meta: { name: string; version: string };
  rules: Record<string, Rule.RuleModule>;
  configs: Record<'recommended' | 'strict', { rules: Linter.RulesRecord }>;
};

export type A11yBundle = {
  /** wrapped plugin; the react and astro presets both register it as `jsx-a11y` */
  plugin: ESLint.Plugin;
  recommendedRules: Linter.RulesRecord;
  strictRules: Linter.RulesRecord;
};

type AnyNode = Record<string, unknown> & { type: string };

// astro template node types the base rules must see as their JSX equivalents
const TYPE_MAP: Record<string, string> = {
  AstroRawText: 'JSXText',
  AstroTemplateLiteralAttribute: 'JSXAttribute',
  AstroShorthandAttribute: 'JSXAttribute',
};

// astro/html attribute spellings mapped to the react names the base rules match on
const ATTRIBUTE_MAP: Record<string, string> = {
  'set:html': 'dangerouslySetInnerHTML',
  'set:text': 'children',
  autofocus: 'autoFocus',
  for: 'htmlFor',
};

const isNode = (data: unknown): data is AnyNode => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const { type, range } = data as { type?: unknown; range?: unknown };

  return (
    typeof type === 'string' &&
    Array.isArray(range) &&
    range.length === 2 &&
    typeof range[0] === 'number' &&
    typeof range[1] === 'number'
  );
};

const getAttributeName = (node: AnyNode): string | null => {
  if (node.type === 'JSXSpreadAttribute' || !isNode(node.name)) {
    return null;
  }

  const name = node.name;

  if (name.type === 'JSXIdentifier') {
    return name.name as string;
  }

  if (name.type === 'JSXNamespacedName' && isNode(name.namespace) && isNode(name.name)) {
    return `${name.namespace.name as string}:${name.name.name as string}`;
  }

  return null;
};

/**
 * Wrap an astro AST node in a proxy that reports the JSX-equivalent `type` (and, for
 * renamed attributes, the react attribute name), recursing into child nodes on access.
 */
const createProxyNode = (node: AnyNode, overrides?: Record<string, unknown> | undefined): AnyNode => {
  const cache: Record<PropertyKey, unknown> = {
    type: TYPE_MAP[node.type] ?? node.type,
    ...overrides,
  };

  if (cache.type === 'JSXAttribute') {
    const attributeName = getAttributeName(node);
    const renamed = attributeName === null ? undefined : ATTRIBUTE_MAP[attributeName];

    if (renamed !== undefined && isNode(node.name)) {
      cache.name = createProxyNode(node.name, { type: 'JSXIdentifier', namespace: null, name: renamed });
    }
  }

  return new Proxy(node, {
    get(_target, key) {
      if (Object.hasOwn(cache, key)) {
        return cache[key];
      }

      const data = (node as Record<PropertyKey, unknown>)[key];

      if (isNode(data)) {
        cache[key] = createProxyNode(data);

        return cache[key];
      }

      if (Array.isArray(data)) {
        cache[key] = data.map((element) => (isNode(element) ? createProxyNode(element) : element));

        return cache[key];
      }

      return data;
    },
  });
};

/**
 * The base rules register visitors for JSX node types; derive the astro spellings of a
 * listener key (which may be an esquery selector) so events dispatched for astro-specific
 * nodes reach those visitors too.
 */
const astroListenerKeys = (key: string): string[] => {
  const keys = new Set<string>();

  for (const [astroType, jsxType] of Object.entries(TYPE_MAP)) {
    const astroKey = key.replaceAll(new RegExp(String.raw`\b${jsxType}\b`, 'gu'), () => astroType);

    if (astroKey !== key) {
      keys.add(astroKey);
    }
  }

  return [...keys];
};

// the fork reads `settings['jsx-a11y-x']`; accept the classic `jsx-a11y` key so consumer
// component mappings keep working under the uniform `jsx-a11y` rule ids
const bridgeSettings = (context: Rule.RuleContext): Rule.RuleContext => {
  const settings = context.settings;

  if (settings['jsx-a11y-x'] !== undefined || settings['jsx-a11y'] === undefined) {
    return context;
  }

  return Object.create(context, {
    settings: { value: { ...settings, 'jsx-a11y-x': settings['jsx-a11y'] } },
  }) as Rule.RuleContext;
};

const wrapA11yRule = (baseRule: Rule.RuleModule): Rule.RuleModule => ({
  ...baseRule,
  create(context) {
    const listener = baseRule.create(bridgeSettings(context));

    // outside astro templates the base rule runs untouched
    if (context.sourceCode.parserServices?.isAstro !== true) {
      return listener;
    }

    const remapped: Rule.RuleListener = {};

    for (const [key, original] of Object.entries(listener)) {
      if (!original) {
        continue;
      }

      const wrapped = (node: AnyNode, ...args: unknown[]): void => {
        (original as (...callArgs: unknown[]) => void)(createProxyNode(node), ...args);
      };

      remapped[key] = wrapped as never;

      for (const astroKey of astroListenerKeys(key)) {
        remapped[astroKey] ??= wrapped as never;
      }
    }

    return remapped;
  },
});

const rekeyRules = (rules: Linter.RulesRecord): Linter.RulesRecord =>
  Object.fromEntries(
    Object.entries(rules).map(([id, entry]) => [id.replace(/^jsx-a11y-x\//u, 'jsx-a11y/'), entry]),
  );

async function createBundle(): Promise<A11yBundle> {
  const { default: baseModule } = await import('eslint-plugin-jsx-a11y-x');
  const base = baseModule as unknown as A11yBasePlugin;

  return {
    plugin: {
      meta: { name: '@entwico/jsx-a11y', version: base.meta.version },
      rules: Object.fromEntries(
        Object.entries(base.rules).map(([name, rule]) => [name, wrapA11yRule(rule)]),
      ),
    },
    recommendedRules: rekeyRules(base.configs.recommended.rules),
    strictRules: rekeyRules(base.configs.strict.rules),
  };
}

let bundle: Promise<A11yBundle> | undefined;

/**
 * Load `eslint-plugin-jsx-a11y-x` wrapped for use on both JSX files and astro templates,
 * under uniform `jsx-a11y/*` rule ids.
 *
 * Cached so the react and astro presets register the identical plugin object — flat config
 * rejects the same plugin name mapped to two different objects.
 */
export function loadA11y(): Promise<A11yBundle> {
  bundle ??= createBundle();

  return bundle;
}
