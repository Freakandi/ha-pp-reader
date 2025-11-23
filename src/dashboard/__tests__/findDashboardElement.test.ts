import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

test('findDashboardElement resolves dashboards registered via registry in shadow DOM', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  const globalState = globalThis as unknown as Record<string, unknown>;

  const previousWindow = globalState.window;
  const previousDocument = globalState.document;
  const previousHTMLElement = globalState.HTMLElement;
  const previousCustomElements = globalState.customElements;

  try {
    globalState.window = dom.window;
    globalState.document = dom.window.document;
    globalState.HTMLElement = dom.window.HTMLElement;
    globalState.customElements = dom.window.customElements;

    const { __TEST_ONLY_DASHBOARD, registerDashboardElement, registerPanelHost, unregisterDashboardElement, unregisterPanelHost } =
      await import('../../dashboard');

    const panelHost = dom.window.document.createElement('div');
    const shadow = panelHost.attachShadow({ mode: 'open' });
    const dashboard = dom.window.document.createElement('pp-reader-dashboard');
    shadow.appendChild(dashboard);
    dom.window.document.body.appendChild(panelHost);

    registerPanelHost(panelHost);
    registerDashboardElement(dashboard);

    const found = __TEST_ONLY_DASHBOARD.findDashboardElement();
    assert.strictEqual(
      found,
      dashboard,
      'dashboards inside panel shadows should be discoverable via registry entries',
    );

    unregisterDashboardElement(dashboard);
    unregisterPanelHost(panelHost);
  } finally {
    if (previousWindow === undefined) {
      delete globalState.window;
    } else {
      globalState.window = previousWindow;
    }

    if (previousDocument === undefined) {
      delete globalState.document;
    } else {
      globalState.document = previousDocument;
    }

    if (previousHTMLElement === undefined) {
      delete globalState.HTMLElement;
    } else {
      globalState.HTMLElement = previousHTMLElement;
    }

    if (previousCustomElements === undefined) {
      delete globalState.customElements;
    } else {
      globalState.customElements = previousCustomElements;
    }
  }
});
