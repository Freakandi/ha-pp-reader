/**
 * Global shims for the Node test runner so dashboard tests can import
 * browser-centric modules without failing on missing Web APIs.
 */

const registry = new Map();

if (typeof globalThis.customElements === 'undefined') {
  globalThis.customElements = {
    define(name, ctor) {
      if (!registry.has(name)) {
        registry.set(name, ctor);
      }
    },
    get(name) {
      return registry.get(name);
    },
    upgrade() {
      // No-op for tests; upgrade is irrelevant in the jsdom environment.
    },
    whenDefined(name) {
      return Promise.resolve(registry.get(name));
    },
  };
}

export {};
