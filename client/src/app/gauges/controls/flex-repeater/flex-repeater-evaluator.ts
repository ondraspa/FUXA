/**
 * flex-repeater-evaluator.ts
 *
 * Sandboxed binding expression evaluation for the Flex Repeater.
 *
 * Grammar (mustache-style, Ignition Perspective-inspired):
 *   {{ <dotted-path> }}
 *
 * Security contract: ONLY dotted property traversal over the per-instance
 * context is supported. No eval(), no function calls, no array access, no
 * operators. Anything outside the grammar renders as an empty string and is
 * logged once per expression (never thrown).
 */
import type {
  AssetObject,
  BuiltInstance,
  FlexRepeaterContext,
  FlexRepeaterProperties,
  RegisteredInstanceBinding,
} from './flex-repeater.model';

const TOKEN = /\{\{\s*([^}]+?)\s*\}\}/g;
const PATH = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/;

/** Build the scoped context for one asset object. */
export function createContext(
  item: AssetObject,
  index: number,
  total: number,
): FlexRepeaterContext {
  return {
    item,
    asset_path: String(item.asset_path ?? ''),
    $index: index,
    $first: index === 0,
    $last: index === total - 1,
  };
}

/** Resolve a dotted path against the context. Returns undefined when not found. */
export function resolve(path: string, ctx: FlexRepeaterContext): unknown {
  const trimmed = path.trim();
  if (!PATH.test(trimmed)) {
    return undefined;
  }
  let value: unknown = ctx as unknown as Record<string, unknown>;
  for (const key of trimmed.split('.')) {
    if (value === null || value === undefined || typeof value !== 'object') {
      return undefined;
    }
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

/** Interpolate `{{ expr }}` tokens in a template string against the context. */
export function interpolate(template: string, ctx: FlexRepeaterContext): string {
  return template.replace(TOKEN, (match, expr: string) => {
    const value = resolve(expr, ctx);
    return value === null || value === undefined ? '' : String(value);
  });
}

/**
 * Evaluate all per-instance tag bindings declared on the item template.
 * Produces resolved tag addresses routed to each instance's widget module.
 */
export function evaluateBindings(
  properties: FlexRepeaterProperties,
  instance: BuiltInstance,
): RegisteredInstanceBinding[] {
  const bindings = properties.itemTemplate.bindings ?? {};
  const result: RegisteredInstanceBinding[] = [];
  for (const [key, def] of Object.entries(bindings)) {
    const elementId = instance.bindingIdMap.get(key) ?? instance.bindingIdMap.get(def.id);
    if (!elementId) {
      console.warn(
        `[flex-repeater] binding '${key}' references template element '${def.id}' which was not found in the child template.`,
      );
    }
    result.push({
      instanceIndex: instance.index,
      bindingKey: key,
      tagAddress: interpolate(def.tag, instance.context),
      moduleId: instance.widgetModule?.moduleId ?? null,
      elementId: elementId ?? '',
    });
  }
  return result;
}
