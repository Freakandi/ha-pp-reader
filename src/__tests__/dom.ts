/**
 * Test helpers for installing and restoring a DOM-like environment via JSDOM.
 */

import { JSDOM } from 'jsdom';

type DomGlobals = typeof globalThis & {
  window?: Window & typeof globalThis;
  document?: Document;
  HTMLElement?: typeof HTMLElement;
  HTMLTableElement?: typeof HTMLTableElement;
  Element?: typeof Element;
  Node?: typeof Node;
};

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

const DEFAULT_MARKUP = '<!doctype html><html><body><div id="root"></div></body></html>';

/**
 * Installs JSDOM-backed DOM globals for test cases that rely on browser APIs.
 *
 * The previous global values are captured and restored once the returned handle's
 * `restore` method is invoked. Consumers are expected to call `restore` in a
 * `finally` block to avoid leaking DOM state between tests.
 */
export function installDomEnvironment(markup: string = DEFAULT_MARKUP): InstalledDomEnvironment {
  const dom = new JSDOM(markup);
  const globalRef = globalThis as DomGlobals;

  const previousWindow = globalRef.window;
  const previousDocument = globalRef.document;
  const previousHTMLElement = globalRef.HTMLElement;
  const previousHTMLTableElement = globalRef.HTMLTableElement;
  const previousElement = globalRef.Element;
  const previousNode = globalRef.Node;

  const hadWindow = Object.prototype.hasOwnProperty.call(globalRef, 'window');
  const hadDocument = Object.prototype.hasOwnProperty.call(globalRef, 'document');
  const hadHTMLElement = Object.prototype.hasOwnProperty.call(globalRef, 'HTMLElement');
  const hadHTMLTableElement = Object.prototype.hasOwnProperty.call(
    globalRef,
    'HTMLTableElement',
  );
  const hadElement = Object.prototype.hasOwnProperty.call(globalRef, 'Element');
  const hadNode = Object.prototype.hasOwnProperty.call(globalRef, 'Node');

  const windowInstance = dom.window as unknown as Window & typeof globalThis;
  globalRef.window = windowInstance;
  globalRef.document = dom.window.document;
  globalRef.HTMLElement = dom.window.HTMLElement;
  globalRef.HTMLTableElement = dom.window.HTMLTableElement;
  globalRef.Element = dom.window.Element;
  globalRef.Node = dom.window.Node;

  return {
    window: windowInstance,
    document: dom.window.document,
    restore() {
      const target = globalThis as DomGlobals;

      if (hadWindow) {
        target.window = previousWindow;
      } else {
        Reflect.deleteProperty(target, 'window');
      }

      if (hadDocument) {
        target.document = previousDocument;
      } else {
        Reflect.deleteProperty(target, 'document');
      }

      if (hadHTMLElement) {
        target.HTMLElement = previousHTMLElement;
      } else {
        Reflect.deleteProperty(target, 'HTMLElement');
      }

      if (hadHTMLTableElement) {
        target.HTMLTableElement = previousHTMLTableElement;
      } else {
        Reflect.deleteProperty(target, 'HTMLTableElement');
      }

      if (hadElement) {
        target.Element = previousElement;
      } else {
        Reflect.deleteProperty(target, 'Element');
      }

      if (hadNode) {
        target.Node = previousNode;
      } else {
        Reflect.deleteProperty(target, 'Node');
      }

      dom.window.close();
    },
  };
}
