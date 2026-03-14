/**
 * Test helpers for installing and restoring a DOM-like environment via JSDOM.
 */
export interface InstalledDomEnvironment {
    /** The window instance exposed on the global object. */
    window: Window & typeof globalThis;
    /** The associated document instance. */
    document: Document;
    /**
     * Restores previously installed globals and closes the underlying JSDOM instance.
     */
    restore(): void;
}
/**
 * Installs JSDOM-backed DOM globals for test cases that rely on browser APIs.
 *
 * The previous global values are captured and restored once the returned handle's
 * `restore` method is invoked. Consumers are expected to call `restore` in a
 * `finally` block to avoid leaking DOM state between tests.
 */
export declare function installDomEnvironment(markup?: string): InstalledDomEnvironment;
//# sourceMappingURL=dom.d.ts.map