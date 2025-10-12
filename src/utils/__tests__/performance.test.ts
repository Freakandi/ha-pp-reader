/**
 * Unit tests for normalising backend-provided performance payloads.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { normalizePerformancePayload } from "../performance";

void test("normalizePerformancePayload accepts numeric strings", () => {
  const payload = normalizePerformancePayload({
    gain_abs: "12.345",
    gain_pct: "5.67",
    total_change_eur: "8.9",
    total_change_pct: "1.23",
    source: "snapshot",
    coverage_ratio: "0.95",
    day_change: {
      price_change_native: "0.42",
      price_change_eur: "0.39",
      change_pct: "0.38",
      source: "derived",
      coverage_ratio: "0.5",
    },
  });

  assert.ok(payload, "expected payload to be normalised");
  assert.strictEqual(payload?.gain_abs, 12.345);
  assert.strictEqual(payload?.gain_pct, 5.67);
  assert.strictEqual(payload?.total_change_eur, 8.9);
  assert.strictEqual(payload?.total_change_pct, 1.23);
  assert.strictEqual(payload?.source, "snapshot");
  assert.strictEqual(payload?.coverage_ratio, 0.95);
  assert.strictEqual(payload?.day_change?.price_change_native, 0.42);
  assert.strictEqual(payload?.day_change?.price_change_eur, 0.39);
  assert.strictEqual(payload?.day_change?.change_pct, 0.38);
  assert.strictEqual(payload?.day_change?.source, "derived");
  assert.strictEqual(payload?.day_change?.coverage_ratio, 0.5);
});

void test("normalizePerformancePayload rejects non-numeric strings", () => {
  const payload = normalizePerformancePayload({
    gain_abs: "NaN",
    gain_pct: "not-a-number",
    total_change_eur: null,
    total_change_pct: undefined,
  });

  assert.strictEqual(payload, null);
});
