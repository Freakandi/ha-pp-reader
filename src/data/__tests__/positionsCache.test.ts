import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizePositionRecord } from '../positionsCache';

test('normalizePositionRecord prefers EUR/account purchase totals over native amounts', () => {
  const raw = {
    security_uuid: 'fx-sec',
    name: 'FX Security',
    currency_code: 'USD',
    current_holdings: 5,
    purchase_value: 1000,
    current_value: 1500,
    aggregation: {
      purchase_total_account: '1350.5',
      purchase_total_security: '1000',
      purchase_value_eur: '1350.5',
    },
  };

  const normalized = normalizePositionRecord(raw);

  assert.ok(normalized, 'normalized position should be returned');
  assert.strictEqual(normalized.purchase_value, 1350.5);
  assert.strictEqual(normalized.current_value, 1500);
  assert.strictEqual(normalized.aggregation?.purchase_total_account, 1350.5);
});
