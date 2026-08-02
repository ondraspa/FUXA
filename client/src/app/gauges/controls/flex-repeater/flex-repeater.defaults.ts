/**
 * flex-repeater.defaults.ts
 *
 * Default Flex Repeater configuration used by the editor toolbar button, so a
 * freshly placed repeater renders immediately against the bundled pump widget
 * and mock UNS assets.
 */
import type { FlexRepeaterProperties } from './flex-repeater.model';

export const DEFAULT_FLEX_REPEATER_PROPERTIES: FlexRepeaterProperties = {
    orientation: 'horizontal',
    spacing: 12,
    instanceIdPrefix: 'pump',
    dataSource: {
        source: 'mock',
        mockFile: 'assets/mock/uns_pumps.json',
    },
    itemTemplate: {
        widgetRef: '_widgets/flex/pump.svg',
        bindings: {
            _pb_running: { tag: '{{ asset_path }}/status/running', id: 'status-led' },
            _pn_speed: { tag: '{{ asset_path }}/process/speed', id: 'speed-text' },
        },
        text: { 'asset-label': '{{ asset_path }}' },
    },
};
