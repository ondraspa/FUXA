/**
 * flex-repeater.tokens.ts
 *
 * Angular DI wiring for the Flex Repeater's three integration seams, bound to
 * FUXA's actual services:
 *
 *   FLEX_REPEATER_WIDGET_LIBRARY          -> FuxaWidgetLibrary        (server widget SVG)
 *   FLEX_REPEATER_ASSET_DATA_SOURCE_LOADER-> FuxaAssetDataSourceLoader (server assets)
 *   FLEX_REPEATER_TAG_BINDING_REGISTRY    -> FuxaTagBindingRegistry   (GaugeSettings property)
 *
 * The FUXA control is static (DI-free) and constructs these adapters itself;
 * these providers make the same FUXA-backed implementations resolvable for any
 * Angular consumer of the fuxa-repeater module.
 */
import { InjectionToken, Provider } from '@angular/core';
import type { FlexRepeaterScriptProcessor } from './flex-repeater-engine';
import type {
    AssetDataSourceLoader,
    TagBindingRegistry,
    WidgetLibrary,
} from './flex-repeater-ports';
import {
    FuxaAssetDataSourceLoader,
    FuxaTagBindingRegistry,
    FuxaWidgetLibrary,
    FuxaWidgetScriptProcessor,
} from './flex-repeater-fuxa-adapters';

export const FLEX_REPEATER_WIDGET_LIBRARY = new InjectionToken<WidgetLibrary>(
    'FLEX_REPEATER_WIDGET_LIBRARY',
);
export const FLEX_REPEATER_ASSET_DATA_SOURCE_LOADER = new InjectionToken<AssetDataSourceLoader>(
    'FLEX_REPEATER_ASSET_DATA_SOURCE_LOADER',
);
export const FLEX_REPEATER_TAG_BINDING_REGISTRY = new InjectionToken<TagBindingRegistry>(
    'FLEX_REPEATER_TAG_BINDING_REGISTRY',
);
export const FLEX_REPEATER_SCRIPT_PROCESSOR = new InjectionToken<FlexRepeaterScriptProcessor>(
    'FLEX_REPEATER_SCRIPT_PROCESSOR',
);

/** Provider set that wires the tokens to FUXA's real services. */
export const FLEX_REPEATER_PROVIDERS: Provider[] = [
    { provide: FLEX_REPEATER_WIDGET_LIBRARY, useClass: FuxaWidgetLibrary },
    { provide: FLEX_REPEATER_ASSET_DATA_SOURCE_LOADER, useClass: FuxaAssetDataSourceLoader },
    { provide: FLEX_REPEATER_TAG_BINDING_REGISTRY, useClass: FuxaTagBindingRegistry },
    { provide: FLEX_REPEATER_SCRIPT_PROCESSOR, useClass: FuxaWidgetScriptProcessor },
];
