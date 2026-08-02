/**
 * flex-repeater-ports.ts
 *
 * Integration seams (ports) the Flex Repeater uses to talk to the host
 * environment. FUXA wires the real implementations (see
 * flex-repeater-fuxa-adapters.ts); tests provide fakes. Kept Angular-free so
 * the core logic is unit-testable.
 */
import type {
  AssetObject,
  FlexRepeaterDataSource,
  RegisteredInstanceBinding,
} from './flex-repeater.model';

/** Resolves the repeater's data source into an array of Asset Objects. */
export interface AssetDataSourceLoader {
  load(dataSource: FlexRepeaterDataSource): Promise<AssetObject[]>;
}

/** Provides the child widget template SVG by widget reference. */
export interface WidgetLibrary {
  getWidgetSvg(widgetRef: string): Promise<string>;
}

/** A live per-instance tag binding subscribed through FUXA's signal map. */
export interface TagBindingRegistry {
  register(binding: RegisteredInstanceBinding): void;
  unregister(binding: RegisteredInstanceBinding): void;
}

/** No-op registry; safe default when FUXA's registry is not wired. */
export class NullTagBindingRegistry implements TagBindingRegistry {
  register(): void {}
  unregister(): void {}
}

/** Default data-source loader: 'static' inline JSON, 'mock' via fetch(). */
export class DefaultAssetDataSourceLoader implements AssetDataSourceLoader {
  constructor(private readonly resolveUrl: (input?: string) => string = (v) => v ?? '') {}

  async load(dataSource: FlexRepeaterDataSource): Promise<AssetObject[]> {
    if (dataSource.source === 'static') {
      return Array.isArray(dataSource.inlineJson) ? dataSource.inlineJson : [];
    }
    if (dataSource.source === 'mock') {
      const url = this.resolveUrl(dataSource.mockFile);
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
      return data as AssetObject[];
    }
    throw new Error('[flex-repeater] Unsupported dataSource.source.');
  }
}

/** Spy-friendly fake for tests. */
export class FakeTagBindingRegistry implements TagBindingRegistry {
  readonly calls: Array<{ op: 'register' | 'unregister'; binding: RegisteredInstanceBinding }> = [];

  register(binding: RegisteredInstanceBinding): void {
    this.calls.push({ op: 'register', binding });
  }

  unregister(binding: RegisteredInstanceBinding): void {
    this.calls.push({ op: 'unregister', binding });
  }

  get active(): RegisteredInstanceBinding[] {
    const opened = new Map<string, RegisteredInstanceBinding>();
    for (const call of this.calls) {
      const key = `${call.binding.tagAddress}|${call.binding.instanceIndex}|${call.binding.bindingKey}`;
      if (call.op === 'register') {
        opened.set(key, call.binding);
      } else {
        opened.delete(key);
      }
    }
    return [...opened.values()];
  }
}
