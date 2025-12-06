/**
 * Tests for the overview tab purchase price rendering.
 * Validates that security currency values are prioritised
 * and account currency fallbacks remain accessible.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { installDomEnvironment } from '../../__tests__/dom';

type OverviewModule = typeof import('../overview');

type BuildPurchasePriceDisplayForTest = (position: Record<string, unknown>) => {
  markup: string;
  sortValue: number;
  ariaLabel: string;
};

interface OverviewTestHelpers {
  buildPurchasePriceDisplayForTest: BuildPurchasePriceDisplayForTest;
}

function getOverviewTestHelpers(module: OverviewModule): OverviewTestHelpers {
  const { buildPurchasePriceDisplayForTest } = module.__TEST_ONLY__;
  if (typeof buildPurchasePriceDisplayForTest !== 'function') {
    throw new Error('Failed to load overview helper for tests');
  }
  return { buildPurchasePriceDisplayForTest };
}

let cachedModule: OverviewModule | undefined;

async function withOverviewModule<T>(
  callback: (module: OverviewModule) => T | Promise<T>,
): Promise<T> {
  const env = installDomEnvironment();

  try {
    if (!cachedModule) {
      cachedModule = await import('../overview');
    }

    return await callback(cachedModule);
  } finally {
    env.restore();
  }
}

void test(
  'buildPurchasePriceDisplayForTest renders security currency as primary and account secondary',
  async () =>
    withOverviewModule(module => {
      const { buildPurchasePriceDisplayForTest: helper } = getOverviewTestHelpers(module);
      const { markup, ariaLabel, sortValue } = helper({
        security_uuid: 'security-avg',
        name: 'SSR Mining',
        security_currency_code: 'CAD',
        account_currency_code: 'EUR',
        aggregation: {
          total_holdings: 100,
          positive_holdings: 100,
          purchase_value_cents: 49420,
          purchase_value_eur: 494.2,
          security_currency_total: 724.89,
          account_currency_total: 494.2,
          purchase_total_security: 724.89,
          purchase_total_account: 494.2,
        },
        average_cost: {
          native: 7.2489,
          security: 7.2489,
          account: 4.942,
          eur: 4.942,
          source: 'totals',
          coverage_ratio: 1,
        },
        performance: {
          gain_abs: 0,
          gain_pct: 0,
          total_change_eur: 0,
          total_change_pct: 0,
          source: 'snapshot',
          coverage_ratio: 1,
          day_change: null,
        },
      });

      assert.match(markup, /purchase-price--primary">7,2489\u00A0CAD/);
      assert.match(markup, /purchase-price--secondary">4,942\u00A0EUR/);
      assert.match(ariaLabel, /7,2489 CAD/);
      assert.match(ariaLabel, /4,942 EUR/);
      assert.strictEqual(sortValue, 494.2);
    }),
);

void test(
  'buildPurchasePriceDisplayForTest falls back to account currency and surfaces EUR conversion',
  async () =>
    withOverviewModule(module => {
      const { buildPurchasePriceDisplayForTest: helper } = getOverviewTestHelpers(module);
      const { markup, ariaLabel, sortValue } = helper({
        security_uuid: 'security-fallback',
        name: 'Fallback Security',
        account_currency_code: 'USD',
        aggregation: {
          total_holdings: 80,
          positive_holdings: 80,
          purchase_value_cents: 64000,
          purchase_value_eur: 640,
          security_currency_total: 0,
          account_currency_total: 640,
          purchase_total_security: 0,
          purchase_total_account: 640,
        },
        average_cost: {
          native: null,
          security: null,
          account: 8,
          eur: 8,
          source: 'aggregation',
          coverage_ratio: 1,
        },
        performance: {
          gain_abs: 0,
          gain_pct: 0,
          total_change_eur: 0,
          total_change_pct: 0,
          source: 'snapshot',
          coverage_ratio: 1,
          day_change: null,
        },
      });

      assert.match(markup, /purchase-price--primary">8,00\u00A0USD/);
      assert.match(markup, /purchase-price--secondary">8,00\u00A0EUR/);
      assert.match(ariaLabel, /8,00 USD/);
      assert.match(ariaLabel, /8,00 EUR/);
      assert.strictEqual(sortValue, 640);
    }),
);

void test(
  'buildPurchasePriceDisplayForTest renders a single EUR value for EUR-denominated securities',
  async () =>
    withOverviewModule(module => {
      const { buildPurchasePriceDisplayForTest: helper } = getOverviewTestHelpers(module);
      const { markup, ariaLabel, sortValue } = helper({
        security_uuid: 'security-eur',
        name: 'EUR Equity',
        security_currency_code: 'EUR',
        account_currency_code: 'EUR',
        aggregation: {
          total_holdings: 50,
          positive_holdings: 50,
          purchase_value_cents: 74000,
          purchase_value_eur: 740,
          security_currency_total: 740,
          account_currency_total: 740,
          purchase_total_security: 740,
          purchase_total_account: 740,
        },
        average_cost: {
          native: 14.8015,
          security: 14.8015,
          account: 14.8,
          eur: 14.8,
          source: 'totals',
          coverage_ratio: 1,
        },
        performance: {
          gain_abs: 0,
          gain_pct: 0,
          total_change_eur: 0,
          total_change_pct: 0,
          source: 'snapshot',
          coverage_ratio: 1,
          day_change: null,
        },
      });

      assert.match(markup, /purchase-price--primary">14,80\u00A0EUR/);
      assert.doesNotMatch(markup, /purchase-price--secondary/);
      assert.strictEqual(ariaLabel, '14,80 EUR');
      assert.strictEqual(sortValue, 740);
    }),
);

void test(
  'buildPurchasePriceDisplayForTest prefers provided average_cost payload',
  async () =>
    withOverviewModule(module => {
      const { buildPurchasePriceDisplayForTest: helper } = getOverviewTestHelpers(module);
      const { markup, ariaLabel, sortValue } = helper({
        security_uuid: 'security-average-cost',
        name: 'Average Cost Security',
        current_holdings: '42',
        security_currency_code: 'USD',
        account_currency_code: 'CHF',
        aggregation: {
          total_holdings: 42,
          positive_holdings: 42,
          purchase_value_cents: 10500,
          purchase_value_eur: 105,
          security_currency_total: 131.94678,
          account_currency_total: 105,
          purchase_total_security: 131.94678,
          purchase_total_account: 105,
        },
        average_cost: {
          native: 1.2345,
          security: 3.14159,
          account: 2.5,
          eur: 2.5,
          source: 'totals',
          coverage_ratio: 1,
        },
        performance: {
          gain_abs: 0,
          gain_pct: 0,
          total_change_eur: 0,
          total_change_pct: 0,
          source: 'snapshot',
          coverage_ratio: 1,
          day_change: null,
        },
      });

      assert.match(markup, /purchase-price--primary">3,14159\u00A0USD/);
      assert.match(markup, /purchase-price--secondary">2,50\u00A0EUR/);
      assert.match(ariaLabel, /3,14159 USD/);
      assert.match(ariaLabel, /2,50 EUR/);
      assert.strictEqual(sortValue, 105);
    }),
);

void test(
  'buildPurchasePriceDisplayForTest returns missing placeholder when both average_cost and aggregation absent',
  async () =>
    withOverviewModule(module => {
      const { buildPurchasePriceDisplayForTest: helper } = getOverviewTestHelpers(module);
      const { markup, ariaLabel, sortValue } = helper({
        security_uuid: 'security-missing',
        name: 'Missing Average Security',
        security_currency_code: 'USD',
        aggregation: null,
        average_cost: null,
        performance: {
          gain_abs: 0,
          gain_pct: 0,
          total_change_eur: 0,
          total_change_pct: 0,
          source: 'snapshot',
          coverage_ratio: 1,
          day_change: null,
        },
      });

      assert.match(
        markup,
        /role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—<\/span>/,
      );
      assert.strictEqual(ariaLabel, 'Kein Kaufpreis verfügbar');
      assert.strictEqual(sortValue, 0);
    }),
);

void test(
  'buildPurchasePriceDisplayForTest does not derive averages from aggregation payloads',
  async () =>
    withOverviewModule(module => {
      const helper = module.__TEST_ONLY__
        .buildPurchasePriceDisplayForTest as BuildPurchasePriceDisplayForTest;
      const { markup, ariaLabel, sortValue } = helper({
        security_uuid: 'security-aggregation-only',
        name: 'Aggregation Only',
        security_currency_code: 'USD',
        aggregation: {
          total_holdings: 50,
          positive_holdings: 50,
          purchase_value_cents: 250000,
          purchase_value_eur: 2500,
          security_currency_total: 0,
          account_currency_total: 2500,
          purchase_total_security: 0,
          purchase_total_account: 2500,
        },
        average_cost: null,
        performance: {
          gain_abs: 0,
          gain_pct: 0,
          total_change_eur: 0,
          total_change_pct: 0,
          source: 'snapshot',
          coverage_ratio: 1,
          day_change: null,
        },
      });

      assert.match(
        markup,
        /role="note" aria-label="Kein Kaufpreis verfügbar" title="Kein Kaufpreis verfügbar">—<\/span>/,
      );
      assert.strictEqual(ariaLabel, 'Kein Kaufpreis verfügbar');
      assert.strictEqual(sortValue, 2500);
    }),
);

void test(
  'renderPortfolioPositions prefers performance payload for gain cells',
  async () =>
    withOverviewModule(module => {
      const html = module.renderPortfolioPositions([
        {
          security_uuid: 'performance-security',
          name: 'Performance Equity',
          current_holdings: 10,
          purchase_value: 500,
          current_value: 710,
          gain_abs: 5,
          gain_pct: 1,
          aggregation: {
            total_holdings: 10,
            positive_holdings: 10,
            purchase_value_cents: 50000,
            purchase_value_eur: 500,
            security_currency_total: 500,
            account_currency_total: 500,
            purchase_total_security: 500,
            purchase_total_account: 500,
          },
          performance: {
            gain_abs: 210,
            gain_pct: 42,
            total_change_eur: 210,
            total_change_pct: 42,
            source: 'snapshot',
            coverage_ratio: 0.75,
            day_change: {
              price_change_native: 0.5,
              price_change_eur: 0.45,
              change_pct: 0.3,
              source: 'native',
              coverage_ratio: 0.6,
            },
          },
        },
      ]);

      const dom = new JSDOM(`<!doctype html><body>${html}</body>`);
      const row = dom.window.document.querySelector<HTMLTableRowElement>('tbody tr.position-row');
      assert.ok(row, 'expected a rendered position row');

      const gainAbsCell = row.querySelector<HTMLTableCellElement>('td.align-right[data-gain-pct]');
      assert.ok(gainAbsCell, 'expected gain absolute cell with metadata');
      const gainAbsRaw = gainAbsCell.textContent;
      assert.ok(gainAbsRaw, 'expected gain absolute cell to provide text content');
      const gainAbsText = gainAbsRaw.replace(/\s+/g, ' ').trim();
      assert.ok(
        gainAbsText.includes('210,00'),
        `gain absolute cell should reflect performance payload, got ${gainAbsText}`,
      );
      assert.strictEqual(gainAbsCell.dataset.gainPct, '42,00 %');
      assert.strictEqual(gainAbsCell.dataset.gainSign, 'positive');

      const gainPctCell = row.querySelector<HTMLTableCellElement>('td.gain-pct-cell');
      assert.ok(gainPctCell, 'expected gain percentage cell');
      const gainPctRaw = gainPctCell.textContent;
      assert.ok(gainPctRaw, 'expected gain percentage cell to provide text content');
      const gainPctText = gainPctRaw.replace(/\s+/g, ' ').trim();
      assert.ok(
        gainPctText.includes('42,00'),
        `gain percentage cell should reflect performance payload, got ${gainPctText}`,
      );
      const trendSpan = gainPctCell.querySelector('span.positive');
      assert.ok(trendSpan, 'gain percentage cell should display positive trend styling');
    }),
);

void test(
  'renderPortfolioPositions surfaces placeholders when performance metrics missing',
  async () =>
    withOverviewModule(module => {
      const html = module.renderPortfolioPositions([
        {
          security_uuid: 'performance-missing',
          name: 'No Metrics Corp',
          current_holdings: 5,
          purchase_value: 500,
          current_value: 525,
          aggregation: {
            total_holdings: 5,
            positive_holdings: 5,
            purchase_value_cents: 50000,
            purchase_value_eur: 500,
            security_currency_total: 525,
            account_currency_total: 500,
            purchase_total_security: 525,
            purchase_total_account: 500,
          },
          average_cost: null,
          performance: null,
        },
      ]);

      const dom = new JSDOM(`<!doctype html><body>${html}</body>`);
      const row = dom.window.document.querySelector<HTMLTableRowElement>('tbody tr.position-row');
      assert.ok(row, 'expected rendered placeholder row');

      const gainAbsCell = row.querySelector<HTMLTableCellElement>('td.align-right[data-gain-pct]');
      assert.ok(gainAbsCell, 'expected gain absolute cell');
      const gainAbsText = gainAbsCell.textContent.trim();
      assert.strictEqual(gainAbsText, '—');
      assert.strictEqual(gainAbsCell.dataset.gainPct, '—');
      assert.strictEqual(gainAbsCell.dataset.gainSign, 'neutral');

      const gainPctCell = row.querySelector<HTMLTableCellElement>('td.gain-pct-cell');
      assert.ok(gainPctCell, 'expected gain percentage cell');
      const gainPctText = gainPctCell.textContent.trim();
      assert.strictEqual(gainPctText, '—');
    }),
);
