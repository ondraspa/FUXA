/**
 * flex-repeater-binding-coordinator.ts
 *
 * Tracks the set of per-instance tag bindings a given repeater has registered
 * with FUXA, and guarantees symmetric unregistration when the repeater
 * re-renders or is destroyed.
 *
 * Each repeater instance owns a unique key so multiple repeaters in a view do
 * not interfere. Re-registering under the same key first unregisters whatever
 * was active under it.
 */
import type { RegisteredInstanceBinding } from './flex-repeater.model';
import type { TagBindingRegistry } from './flex-repeater-ports';

export class FlexRepeaterBindingCoordinator {
  private readonly active = new Map<string, RegisteredInstanceBinding[]>();

  constructor(private readonly registry: TagBindingRegistry) {}

  register(key: string, bindings: RegisteredInstanceBinding[]): void {
    this.unregisterAll(key);
    this.active.set(key, bindings);
    for (const binding of bindings) {
      this.registry.register(binding);
    }
  }

  unregisterAll(key: string): void {
    const previous = this.active.get(key);
    if (previous) {
      for (const binding of previous) {
        this.registry.unregister(binding);
      }
      this.active.delete(key);
    }
  }

  /** Number of currently active bindings for a key (used in tests/metrics). */
  count(key: string): number {
    return this.active.get(key)?.length ?? 0;
  }
}
