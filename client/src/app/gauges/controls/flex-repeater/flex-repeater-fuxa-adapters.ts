/**
 * flex-repeater-fuxa-adapters.ts
 *
 * Real FUXA-backed implementations of the Flex Repeater integration seams:
 *
 *   WIDGET_LIBRARY         -> FuxaWidgetLibrary        (fetches widget SVGs from the server)
 *   ASSET_DATA_SOURCE_LOADER -> FuxaAssetDataSourceLoader (fetches asset JSON via EndPointApi)
 *   TAG_BINDING_REGISTRY   -> FuxaTagBindingRegistry   (persists per-instance bindings into the
 *                                                       GaugeSettings property consumed by
 *                                                       getSignals()/processValue())
 *
 * Plus FuxaWidgetScriptProcessor, which turns each instance's widget <script>
 * into a FUXA module using the same SvgUtils machinery the html-image control
 * uses, so `window[moduleId].putValue(varName, value)` works per instance.
 */
import { GaugeSettings } from '../../../_models/hmi';
import { EndPointApi } from '../../../_helpers/endpointapi';
import { SvgUtils } from '../../../_helpers/svg-utils';
import type {
  FlexRepeaterWidgetModule,
  RegisteredInstanceBinding,
} from './flex-repeater.model';
import type { FlexRepeaterScriptProcessor } from './flex-repeater-engine';
import type {
  AssetDataSourceLoader,
  TagBindingRegistry,
  WidgetLibrary,
} from './flex-repeater-ports';

/** Loads child widget SVG content from the FUXA server widget library. */
export class FuxaWidgetLibrary implements WidgetLibrary {
  async getWidgetSvg(widgetRef: string): Promise<string> {
    const url = resolveWidgetUrl(widgetRef);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `[flex-repeater] Failed to load child widget '${widgetRef}' from '${url}': ${response.status} ${response.statusText}`,
      );
    }
    return response.text();
  }
}

/** Loads the mock Asset Object array from a server-served path (or inline JSON). */
export class FuxaAssetDataSourceLoader implements AssetDataSourceLoader {
  async load(dataSource: Parameters<AssetDataSourceLoader['load']>[0]) {
    if (dataSource.source === 'static') {
      return Array.isArray(dataSource.inlineJson) ? dataSource.inlineJson : [];
    }
    const url = EndPointApi.resolveUrl(dataSource.mockFile);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `[flex-repeater] Failed to load mock asset file '${url}': ${response.status} ${response.statusText}`,
      );
    }
    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
      throw new Error(`[flex-repeater] Mock asset file '${url}' is not a JSON array.`);
    }
    return data;
  }
}

/**
 * Turns each instance's raw widget <script> into a FUXA module, exactly like
 * HtmlImageComponent does for a single widget.
 *
 * Module ids are deterministic per gauge + instance index
 * (`wModule_<seed>_<i>`) so re-renders reuse the same globals and the control
 * can skip re-injecting already-registered scripts (see F10 in ASSUMPTIONS.md).
 */
export class FuxaWidgetScriptProcessor implements FlexRepeaterScriptProcessor {
    constructor(private readonly seed: string = 'w') {}

    process(args: { scriptText: string; idMap: Record<string, string>; index: number }): FlexRepeaterWidgetModule | null {
        if (!args.scriptText) {
            return null;
        }
        const moduleId = `wModule_${sanitizeSeed(this.seed)}_${args.index}`;
        const result = SvgUtils.processWidget(args.scriptText, moduleId, args.idMap, []);
        return { moduleId, content: result.content, vars: result.vars };
    }
}

function sanitizeSeed(seed: string): string {
    const cleaned = seed.replace(/[^A-Za-z0-9_-]/g, '_');
    return cleaned || 'w';
}

/**
 * Persists per-instance tag bindings into the GaugeSettings property so the
 * view JSON carries them. `GaugesManager.getBindSignals()` reads them via
 * FlexRepeaterComponent.getSignals() and `processValue()` routes values back
 * to the owning instance module.
 */
export class FuxaTagBindingRegistry implements TagBindingRegistry {
    private gauge: GaugeSettings | null = null;

    constructor(gauge?: GaugeSettings) {
        if (gauge) {
            this.bind(gauge);
        }
    }

    /** Attach the registry to the gauge it is persisting bindings for. */
    bind(gauge: GaugeSettings): this {
        this.gauge = gauge;
        return this;
    }

    register(binding: RegisteredInstanceBinding): void {
        const gauge = this.gauge;
        if (!gauge) {
            return;
        }
        if (!gauge.property) {
            gauge.property = {};
        }
        if (!gauge.property.repeaterBindings) {
            gauge.property.repeaterBindings = [];
        }
        gauge.property.repeaterBindings.push(binding);
    }

    unregister(binding: RegisteredInstanceBinding): void {
        const list = this.gauge?.property?.repeaterBindings;
        if (!Array.isArray(list)) {
            return;
        }
        this.gauge.property.repeaterBindings = list.filter(
            (b: RegisteredInstanceBinding) =>
                !(b.tagAddress === binding.tagAddress && b.instanceIndex === binding.instanceIndex && b.bindingKey === binding.bindingKey),
        );
    }
}

function resolveWidgetUrl(widgetRef: string): string {
  if (/^https?:\/\//.test(widgetRef) || widgetRef.startsWith('/')) {
    return EndPointApi.resolveUrl(widgetRef);
  }
  if (widgetRef.endsWith('.svg')) {
    return EndPointApi.resolveUrl(widgetRef);
  }
  return EndPointApi.resolveUrl(`_widgets/${widgetRef}.svg`);
}
