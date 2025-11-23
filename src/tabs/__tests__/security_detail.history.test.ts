import test from 'node:test';
import assert from 'node:assert/strict';

import { __TEST_ONLY__ } from '../security_detail';

const { parseHistoryDateForTest, resolveRangeOptionsForTest } = __TEST_ONLY__;

test('parseHistoryDateForTest handles numeric YYYYMMDD inputs', () => {
  const parsed = parseHistoryDateForTest(20240103);
  assert.ok(parsed, 'expected parsed date for numeric YYYYMMDD');
  assert.strictEqual(
    parsed?.toISOString().slice(0, 10),
    '2024-01-03',
    'numeric YYYYMMDD should map to a UTC date',
  );
});

test('parseHistoryDateForTest handles epoch-day numeric inputs', () => {
  const parsed = parseHistoryDateForTest(19725);
  assert.ok(parsed, 'expected parsed date for epoch-day numeric input');
  assert.strictEqual(
    parsed?.toISOString().slice(0, 10),
    '2024-01-03',
    'epoch-day numeric should map to a UTC date',
  );
});

test('resolveRangeOptionsForTest returns epoch-day bounds for range queries', () => {
  const today = new Date(Date.UTC(2024, 0, 3));
  const options = resolveRangeOptionsForTest('1M', today);

  assert.strictEqual(options.end_date, 19725, 'end_date should follow epoch-day encoding');
  assert.strictEqual(options.start_date, 19696, 'start_date should track the 30-day window in epoch days');
});
