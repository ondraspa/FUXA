/**
 * flex-repeater.model.ts
 *
 * Foundational FUXA JSON schema for the Flex Repeater container.
 *
 * A `flex-repeater` is a FUXA GaugeSettings whose `type` is
 * 'svg-ext-own_ctrl-flex_repeater'. Instead of mapping individual tags, it
 * points at a data source of Asset Objects (UNS-style
 * `Enterprise/Site/Area/Line/Pumps`) and derives one child widget instance +
 * per-instance tag addresses from each object's `asset_path`.
 */

/** A UNS Asset Object, e.g. { "asset_path": "Enterprise/Site/Area/Line1/Pumps/PUMP_001" }. */
export interface AssetObject {
  asset_path: string;
  [key: string]: unknown;
}

/** Data source for the repeater. v1: mock file or inline JSON. */
export type FlexRepeaterDataSource =
  | { source: 'mock'; mockFile: string }
  | { source: 'static'; inlineJson: AssetObject[] };

/** One dynamic tag binding declared on the child template. */
export interface FlexRepeaterTemplateBinding {
  /** Tag address expression, e.g. "{{ asset_path }}/status/running". */
  tag: string;
  /** Widget variable name the value should route to (FUXA putValue(name, value)). */
  id: string;
}

/** The child widget template definition. */
export interface FlexRepeaterItemTemplate {
  /** Widget path served by FUXA, e.g. '_widgets/flex/pump.svg' (or bare name). */
  widgetRef: string;
  /** Per-instance tag bindings, keyed by the widget variable name (e.g. '_pb_running'). */
  bindings?: Record<string, FlexRepeaterTemplateBinding>;
  /** Static text interpolations: template element id -> "{{ asset_path }}" style expression. */
  text?: Record<string, string>;
}

/** Container-level properties for the Flex Repeater gauge. */
export interface FlexRepeaterProperties {
  orientation: 'horizontal' | 'vertical' | 'grid';
  /** Gap between instances, in px. */
  spacing: number;
  /** Grid only: number of columns. */
  columns?: number;
  dataSource: FlexRepeaterDataSource;
  itemTemplate: FlexRepeaterItemTemplate;
  /** Optional id prefix for per-instance namespacing (defaults to widgetRef basename). */
  instanceIdPrefix?: string;
  /** Safety cap on the number of instantiated children. */
  maxInstances?: number;
}

/** Per-instance evaluation context available to `{{ }}` expressions. */
export interface FlexRepeaterContext {
  item: AssetObject;
  asset_path: string;
  $index: number;
  $first: boolean;
  $last: boolean;
}

/** A widget variable extracted from the child template's //!export-start section. */
export interface FlexRepeaterWidgetVar {
  originalName: string;
  name: string;
  type: string;
  variableId?: string;
  variableValue?: string;
}

/** The processed widget script for one instance (FUXA module pattern). */
export interface FlexRepeaterWidgetModule {
  moduleId: string;
  content: string;
  vars: FlexRepeaterWidgetVar[];
}

/** A fully built, namespaced child instance ready for the container DOM. */
export interface BuiltInstance {
  index: number;
  asset: AssetObject;
  context: FlexRepeaterContext;
  /** The positioned <g> wrapper appended to the container <svg>. */
  root: SVGGElement;
  /** Logical binding key (widget variable name) -> namespaced element id. */
  bindingIdMap: ReadonlyMap<string, string>;
  /** Processed per-instance widget module (present when a script processor is wired). */
  widgetModule?: FlexRepeaterWidgetModule | null;
}

/** A resolved, per-instance tag binding handed to FUXA's binding model. */
export interface RegisteredInstanceBinding {
  instanceIndex: number;
  bindingKey: string;
  /** Fully evaluated tag address, e.g. 'Enterprise/.../PUMP_001/status/running'. */
  tagAddress: string;
  /** FUXA module that owns the instance's putValue. */
  moduleId: string | null;
  /** Namespaced element id (informational; FUXA routes by varName). */
  elementId: string;
}

export const FLEX_REPEATER_DEFAULT_MAX_INSTANCES = 500;
export const FLEX_REPEATER_DEFAULT_SPACING = 0;
export const FLEX_REPEATER_DEFAULT_COLUMNS = 4;
