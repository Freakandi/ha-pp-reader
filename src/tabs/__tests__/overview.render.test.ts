/**
 * Tests for the overview tab purchase price rendering.
 * Validates that security currency values are prioritised
 * and account currency fallbacks remain accessible.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

type BuildPurchasePriceDisplayForTest = (position: Record<string, unknown>) => {
  markup: string;
  sortValue: number;
  ariaLabel: string;
};

let cachedHelper: BuildPurchasePriceDisplayForTest | null = null;

const globalRef = globalThis as typeof globalThis & {
  window?: Window & typeof globalThis;
  document?: Document;
  HTMLElement?: typeof HTMLElement;
  HTMLTableElement?: typeof HTMLTableElement;
  Element?: typeof Element;
  Node?: typeof Node;
};

async function withOverviewModule<T>(
  callback: (helper: BuildPurchasePriceDisplayForTest) => T | Promise<T>,
): Promise<T> {
  const previousWindow = globalRef.window;
  const previousDocument = globalRef.document;
  const previousHTMLElement = globalRef.HTMLElement;
  const previousHTMLTableElement = globalRef.HTMLTableElement;
  const previousElement = globalRef.Element;
  const previousNode = globalRef.Node;

  const dom = new JSDOM('<!doctype html><div id="root"></div>');

  globalRef.window = dom.window as unknown as Window & typeof globalThis;
  globalRef.document = dom.window.document;
  globalRef.HTMLElement = dom.window.HTMLElement;
  globalRef.HTMLTableElement = dom.window.HTMLTableElement;
  globalRef.Element = dom.window.Element;
  globalRef.Node = dom.window.Node;

  try {
    if (!cachedHelper) {
      const overviewModule = await import('../overview');
      cachedHelper = overviewModule.__TEST_ONLY__
        .buildPurchasePriceDisplayForTest as BuildPurchasePriceDisplayForTest;
    }

    const helper = cachedHelper;
    if (!helper) {
      throw new Error('Failed to load overview helper for tests');
    }

    return await callback(helper);
  } finally {
    globalRef.window = previousWindow;
    globalRef.document = previousDocument;
    globalRef.HTMLElement = previousHTMLElement;
    globalRef.HTMLTableElement = previousHTMLTableElement;
    globalRef.Element = previousElement;
    globalRef.Node = previousNode;
  }
}

void test(
  'buildPurchasePriceDisplayForTest renders security currency as primary and account secondary',
  async () =>
    withOverviewModule(helper => {
      const { markup, ariaLabel } = helper({
        security_uuid: 'security-avg',
        name: 'SSR Mining',
        current_holdings: '100',
        security_currency_code: 'CAD',
        account_currency_code: 'EUR',
        avg_price_security: '7.2489',
        avg_price_account: '4.942',
        purchase_total_security: '724.89',
        purchase_total_account: '494.2',
        purchase_value: '494.2',
      });

      assert.match(markup, /purchase-price--primary">7,2489\u00A0CAD/);
      assert.match(markup, /purchase-price--secondary">4,942\u00A0EUR/);
      assert.match(ariaLabel, /7,2489 CAD/);
      assert.match(ariaLabel, /4,942 EUR/);
    }),
);

void test(
  'buildPurchasePriceDisplayForTest falls back to account currency when security averages missing',
  async () =>
    withOverviewModule(helper => {
      const { markup, ariaLabel } = helper({
        security_uuid: 'security-fallback',
        name: 'Fallback Security',
        current_holdings: '80',
        account_currency_code: 'USD',
        purchase_total_account: '640',
        purchase_value: '640',
      });

      assert.match(markup, /purchase-price--primary">8,00\u00A0USD/);
      assert.doesNotMatch(markup, /purchase-price--secondary/);
      assert.strictEqual(ariaLabel, '8,00 USD');
    }),
);
