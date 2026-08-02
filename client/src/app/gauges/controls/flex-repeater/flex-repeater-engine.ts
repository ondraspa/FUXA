/**
 * flex-repeater-engine.ts
 *
 * Orchestrates the Flex Repeater render pipeline. Pure logic, no Angular:
 *   load asset objects -> load child template -> clone/namespace per instance
 *   -> interpolate static text -> position -> (optionally) process each
 *   instance's widget script into a FUXA module.
 *
 * The FUXA control drives it against the real DOM; tests drive it against a
 * headless DOM with fake loaders.
 */
import {
  FLEX_REPEATER_DEFAULT_COLUMNS,
  FLEX_REPEATER_DEFAULT_MAX_INSTANCES,
  FLEX_REPEATER_DEFAULT_SPACING,
  type AssetObject,
  type BuiltInstance,
  type FlexRepeaterContext,
  type FlexRepeaterProperties,
  type FlexRepeaterWidgetModule,
} from './flex-repeater.model';
import { createContext, interpolate } from './flex-repeater-evaluator';
import type { AssetDataSourceLoader, WidgetLibrary } from './flex-repeater-ports';
import { FlexRepeaterSvgService, type SvgBuildResult } from './flex-repeater-svg';

/** Turns the raw widget <script> into a per-instance module (FUXA convention). */
export interface FlexRepeaterScriptProcessor {
  process(args: {
    scriptText: string;
    idMap: Record<string, string>;
    index: number;
  }): FlexRepeaterWidgetModule | null;
}

export interface FlexRepeaterEngineDeps {
  dataSourceLoader: AssetDataSourceLoader;
  widgetLibrary: WidgetLibrary;
  svg: FlexRepeaterSvgService;
  scriptProcessor?: FlexRepeaterScriptProcessor;
}

export class FlexRepeaterEngine {
  private readonly scriptInjected = new WeakSet<SVGGElement>();

  constructor(private readonly deps: FlexRepeaterEngineDeps) {}

  /**
   * Render the repeater into `host`, replacing any previously rendered
   * content, and return the built instances. The returned instances include
   * the context needed to evaluate dynamic tag bindings and, when a script
   * processor is wired, the processed per-instance widget module.
   */
  async renderInto(
    host: SVGGElement,
    properties: FlexRepeaterProperties | null | undefined,
  ): Promise<BuiltInstance[]> {
    this.clear(host);
    if (!properties || !properties.itemTemplate) {
      return [];
    }

    const assets = await this.deps.dataSourceLoader.load(properties.dataSource);
    const cap = clampInt(properties.maxInstances, FLEX_REPEATER_DEFAULT_MAX_INSTANCES);
    const items = assets.slice(0, cap);

    const widgetRef = properties.itemTemplate.widgetRef;
    const template = this.deps.svg.parseTemplate(
      await this.deps.widgetLibrary.getWidgetSvg(widgetRef),
    );
    const size = this.deps.svg.templateSize(template);
    const prefix = properties.instanceIdPrefix ?? widgetRef;

    const instances: BuiltInstance[] = [];
    for (let i = 0; i < items.length; i++) {
      const asset = items[i];
      if (!isValidAsset(asset)) {
        console.warn(`[flex-repeater] Skipping asset at index ${i}: missing asset_path.`);
        continue;
      }
      const context = createContext(asset, i, items.length);
      const built = this.deps.svg.buildInstance(template, prefix, i);
      const widgetModule = this.deps.scriptProcessor
        ? this.deps.scriptProcessor.process({
            scriptText: built.widgetScript ?? '',
            idMap: Object.fromEntries(built.idMap),
            index: i,
          })
        : null;
      const bindingIdMap = this.buildBindingIdMap(properties, built);
      this.applyStaticText(built, properties, context);
      const pos = this.position(i, items.length, size, properties);
      const wrapper = this.deps.svg.wrap(built.root, pos.x, pos.y);
      host.appendChild(wrapper);
      instances.push({ index: i, asset, context, root: wrapper, bindingIdMap, widgetModule });
    }

    // Standalone mode (no script processor): inject the widget script once.
    // FUXA mode: the control injects each instance's module script itself.
    if (!this.deps.scriptProcessor) {
      this.injectScriptOnce(host, template);
    }
    return instances;
  }

  /** Map logical binding key -> namespaced element id (from the template id the binding references). */
  private buildBindingIdMap(
    properties: FlexRepeaterProperties,
    built: SvgBuildResult,
  ): Map<string, string> {
    const bindingIdMap = new Map<string, string>();
    for (const [key, def] of Object.entries(properties.itemTemplate.bindings ?? {})) {
      const mapped = built.idMap.get(def.id);
      if (mapped) {
        bindingIdMap.set(key, mapped);
      }
    }
    return bindingIdMap;
  }

  private applyStaticText(
    built: Pick<SvgBuildResult, 'idMap' | 'elementById'>,
    properties: FlexRepeaterProperties,
    context: FlexRepeaterContext,
  ): void {
    const texts = properties.itemTemplate.text ?? {};
    for (const [templateId, expression] of Object.entries(texts)) {
      const namespacedId = built.idMap.get(templateId);
      if (!namespacedId) {
        console.warn(
          `[flex-repeater] text binding references '${templateId}' which is not in the child template.`,
        );
        continue;
      }
      const el = built.elementById.get(namespacedId);
      if (el) {
        el.textContent = interpolate(expression, context);
      }
    }
  }

  private position(
    index: number,
    total: number,
    size: { width: number; height: number },
    properties: FlexRepeaterProperties,
  ): { x: number; y: number } {
    const spacing = Number.isFinite(properties.spacing) ? properties.spacing : FLEX_REPEATER_DEFAULT_SPACING;
    if (properties.orientation === 'horizontal') {
      return { x: index * (size.width + spacing), y: 0 };
    }
    if (properties.orientation === 'vertical') {
      return { x: 0, y: index * (size.height + spacing) };
    }
    const columns = Math.max(1, Math.floor(properties.columns ?? FLEX_REPEATER_DEFAULT_COLUMNS));
    const col = index % columns;
    const row = Math.floor(index / columns);
    return {
      x: col * (size.width + spacing),
      y: row * (size.height + spacing),
    };
  }

  private injectScriptOnce(host: SVGGElement, template: SVGSVGElement): void {
    if (this.scriptInjected.has(host)) {
      return;
    }
    const script = extractScript(template);
    if (script) {
      host.appendChild(this.deps.svg.createSvgElement('script')).textContent = script;
    }
    this.scriptInjected.add(host);
  }

  private clear(host: SVGGElement): void {
    while (host.firstChild) {
      host.removeChild(host.firstChild);
    }
    this.scriptInjected.delete(host);
  }
}

function clampInt(value: number | undefined, fallback: number): number {
  const n = Math.floor(Number.isFinite(value) ? (value as number) : fallback);
  return n > 0 ? n : fallback;
}

function isValidAsset(asset: AssetObject): boolean {
  return (
    asset !== null &&
    typeof asset === 'object' &&
    typeof asset.asset_path === 'string' &&
    asset.asset_path !== ''
  );
}

function extractScript(template: SVGSVGElement): string | null {
  let found: string | null = null;
  const walk = (node: Node): void => {
    if (found !== null) return;
    if (node.nodeType === 1 && node.nodeName.toLowerCase() === 'script') {
      found = (node.textContent ?? '').trim() || null;
      return;
    }
    const children = Array.from(node.childNodes ?? []);
    for (const child of children) {
      walk(child);
    }
  };
  walk(template);
  return found;
}
