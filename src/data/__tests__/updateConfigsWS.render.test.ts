import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

type RenderPositionsTableInline = (positions: Record<string, unknown>[]) => string;

const globalRef = globalThis as typeof globalThis & {
  window?: Window & typeof globalThis;
  document?: Document;
  HTMLElement?: typeof HTMLElement;
  HTMLTableElement?: typeof HTMLTableElement;
};

void test(
  'renderPositionsTableInlineForTest embeds average purchase markup',
  async () => {
    const dom = new JSDOM('<!doctype html><div id="root"></div>');

    const previousWindow = globalRef.window;
    const previousDocument = globalRef.document;
    const previousHTMLElement = globalRef.HTMLElement;
    const previousHTMLTableElement = globalRef.HTMLTableElement;

    globalRef.window = dom.window as unknown as Window & typeof globalThis;
    globalRef.document = dom.window.document;
    globalRef.HTMLElement = dom.window.HTMLElement;
    globalRef.HTMLTableElement = dom.window.HTMLTableElement;

    try {
      const module = await import('../updateConfigsWS');
      const helper = module.__TEST_ONLY__
        .renderPositionsTableInlineForTest as RenderPositionsTableInline;

      const html = helper([
        {
          security_uuid: 'sec-1',
          name: 'Example Security',
          current_holdings: 10,
          purchase_value: 500,
          current_value: 620,
          gain_abs: 120,
          gain_pct: 24,
          avg_price_security: 50,
          purchase_total_security: 500,
          purchase_total_account: 500,
          security_currency_code: 'USD',
          account_currency_code: 'EUR',
        },
      ]);

      const container = dom.window.document.createElement('div');
      container.innerHTML = html;
      const priceCell = container.querySelector<HTMLTableCellElement>(
        'tbody tr td:nth-child(3)',
      );

      assert.ok(priceCell, 'price cell should exist');
      const cellHtml = priceCell.innerHTML;

      assert.match(
        cellHtml,
        /purchase-price--primary/,
        'primary purchase price markup should be present',
      );
      assert.match(
        cellHtml,
        /50,00\u00A0USD/, // formatted using de-DE locale
        'security currency average should be rendered',
      );
    } finally {
      globalRef.window = previousWindow;
      globalRef.document = previousDocument;
      globalRef.HTMLElement = previousHTMLElement;
      globalRef.HTMLTableElement = previousHTMLTableElement;
    }
  },
);
