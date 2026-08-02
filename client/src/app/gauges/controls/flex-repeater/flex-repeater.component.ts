/**
 * flex-repeater.component.ts
 *
 * FUXA control (static contract, like HtmlImageComponent) for the Flex
 * Repeater container. Type tag: 'svg-ext-own_ctrl-flex_repeater'.
 *
 * Runtime contract implemented for GaugesManager:
 *   getSignals(pro)  -> synchronous list of resolved tag addresses
 *   initElement(ga)  -> builds the container: loads assets + child widget,
 *                       clones one instance per asset, processes each
 *                       instance's widget script into a FUXA module, and
 *                       persists per-instance bindings into ga.property
 *   processValue(...) -> routes a tag value to the owning instance module:
 *                        window[moduleId].putValue(varName, value)
 *
 * The three integration seams (widget library, asset data source, tag binding
 * registry) are wired to FUXA's real services via the FUXA adapters.
 */
import { GaugeStatus, GaugeSettings, Variable } from '../../../_models/hmi';
import { Utils } from '../../../_helpers/utils';
import { SvgUtils } from '../../../_helpers/svg-utils';
import { GaugeBaseComponent } from '../../gauge-base/gauge-base.component';
import { FlexRepeaterEngine } from './flex-repeater-engine';
import { FlexRepeaterSvgService } from './flex-repeater-svg';
import { FlexRepeaterBindingCoordinator } from './flex-repeater-binding-coordinator';
import { createContext, evaluateBindings, interpolate } from './flex-repeater-evaluator';
import {
    FuxaAssetDataSourceLoader,
    FuxaTagBindingRegistry,
    FuxaWidgetLibrary,
    FuxaWidgetScriptProcessor,
} from './flex-repeater-fuxa-adapters';
import type {
    AssetObject,
    BuiltInstance,
    FlexRepeaterProperties,
    RegisteredInstanceBinding,
} from './flex-repeater.model';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class FlexRepeaterComponent extends GaugeBaseComponent {
    static TypeTag = 'svg-ext-own_ctrl-flex_repeater';
    static LabelTag = 'FlexRepeater';
    static prefixD = 'D-OXC_';
    static propertyWidgetType = 'widget';

    constructor() {
        super();
    }

    /**
     * Synchronous signal list for the binding pipeline. Reads persisted
     * per-instance bindings first; falls back to a synchronous evaluation of a
     * 'static' inline data source so tags subscribe even on the very first load.
     */
    static getSignals(pro: any): string[] {
        if (pro?.repeaterBindings?.length) {
            return pro.repeaterBindings.map((b: RegisteredInstanceBinding) => b.tagAddress);
        }
        const props = pro?.repeater as FlexRepeaterProperties | undefined;
        if (!props?.dataSource) {
            return [];
        }
        const inlineJson = props.dataSource.source === 'static' ? props.dataSource.inlineJson : [];
        if (inlineJson.length && props.itemTemplate?.bindings) {
            const tags: string[] = [];
            inlineJson.forEach((item, i) => {
                const ctx = createContext(item as AssetObject, i, inlineJson.length);
                for (const def of Object.values(props.itemTemplate.bindings)) {
                    tags.push(interpolate(def.tag, ctx));
                }
            });
            return tags;
        }
        return [];
    }

    static initElement(ga: GaugeSettings, isview: boolean): HTMLElement {
        const ele = document.getElementById(ga.id);
        if (!ele) {
            return null;
        }
        const container = Utils.searchTreeStartWith(ele, this.prefixD);
        if (!container) {
            return null;
        }
        const properties = ga.property?.repeater as FlexRepeaterProperties;
        if (!properties?.itemTemplate) {
            console.warn('[flex-repeater] No `property.repeater` configuration found on gauge', ga.id);
            return container;
        }

        // Rebuild the container: one <svg> host, instances appended inside.
        container.innerHTML = '';
        const svgHost = document.createElementNS(SVG_NS, 'svg');
        svgHost.setAttribute('width', '100%');
        svgHost.setAttribute('height', '100%');
        container.appendChild(svgHost);

        const svg = new FlexRepeaterSvgService({ document: window.document });
        const engine = new FlexRepeaterEngine({
            dataSourceLoader: new FuxaAssetDataSourceLoader(),
            widgetLibrary: new FuxaWidgetLibrary(),
            svg,
            scriptProcessor: new FuxaWidgetScriptProcessor(ga.id),
        });
        const coordinator = new FlexRepeaterBindingCoordinator(new FuxaTagBindingRegistry(ga));

        // Namespace instance DOM ids with the gauge id so multiple repeaters in
        // one view never collide (ids stay deterministic across re-renders).
        const renderProperties: FlexRepeaterProperties = {
            ...properties,
            instanceIdPrefix: `${ga.id}_${properties.instanceIdPrefix ?? 'fr'}`,
        };

        ga.property = {
            ...(ga.property || {}),
            type: FlexRepeaterComponent.propertyWidgetType,
            repeater: properties,
            repeaterBindings: [],
        };

        void engine
            .renderInto(svgHost as unknown as SVGGElement, renderProperties)
            .then((instances) => {
                this.injectInstanceScripts(instances);
                const bindings = instances.flatMap((instance) => evaluateBindings(renderProperties, instance));
                coordinator.register(ga.id, bindings);
                ga.property.repeaterBindings = bindings;
                ga.property.svgContent = container.innerHTML;
                return container;
            })
            .catch((err) => {
                console.error('[flex-repeater] Render failed:', err);
            });

        return container;
    }

    /**
     * Each instance's module script is injected into the HTML document (FUXA
     * pattern). Module ids are deterministic per gauge + instance index, so a
     * re-render reuses the same global and we skip re-injecting — this keeps
     * `document.body` from accumulating scripts across repeated view renders.
     */
    private static injectInstanceScripts(instances: BuiltInstance[]): void {
        for (const instance of instances) {
            const module = instance.widgetModule;
            if (!module?.content) {
                continue;
            }
            if ((window as any)[module.moduleId]) {
                continue;
            }
            const script = document.createElement('script');
            script.textContent = SvgUtils.initWidget(module.content, module.vars);
            document.body.appendChild(script);
        }
    }

    static processValue(ga: GaugeSettings, svgele: any, sig: Variable, gaugeStatus: GaugeStatus) {
        try {
            const bindings: RegisteredInstanceBinding[] = ga.property?.repeaterBindings;
            if (!bindings?.length) {
                return;
            }
            const binding = bindings.find((b) => b.tagAddress === sig.id);
            if (!binding || !binding.moduleId) {
                return;
            }
            const mod = (window as any)[binding.moduleId];
            if (mod?.putValue) {
                mod.putValue(binding.bindingKey, sig.value);
            }
        } catch (err) {
            console.error('[flex-repeater] processValue error:', err);
        }
    }

    static detectChange(gab: GaugeSettings, isview: boolean): HTMLElement {
        return FlexRepeaterComponent.initElement(gab, isview);
    }
}
