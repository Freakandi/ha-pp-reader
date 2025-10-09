/**
 * Tests for the overview tab purchase price rendering.
 * Validates that security currency values are prioritised
 * and account currency fallbacks remain accessible.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { __TEST_ONLY__ } from '../overview';

const { buildPurchasePriceDisplayForTest } = __TEST_ONLY__;

test('buildPurchasePriceDisplayForTest renders security currency as primary and account secondary', () => {
  const { markup, ariaLabel } = buildPurchasePriceDisplayForTest({
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
});

test('buildPurchasePriceDisplayForTest falls back to account currency when security averages missing', () => {
  const { markup, ariaLabel } = buildPurchasePriceDisplayForTest({
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
});
