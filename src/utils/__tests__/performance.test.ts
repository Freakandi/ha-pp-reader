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

  if (!payload) {
    assert.fail("expected payload to be normalised");
  }

  const normalised = payload;
  assert.strictEqual(normalised.gain_abs, 12.345);
  assert.strictEqual(normalised.gain_pct, 5.67);
  assert.strictEqual(normalised.total_change_eur, 8.9);
  assert.strictEqual(normalised.total_change_pct, 1.23);
  assert.strictEqual(normalised.source, "snapshot");
  assert.strictEqual(normalised.coverage_ratio, 0.95);

  if (!normalised.day_change) {
    assert.fail("expected day_change payload to be normalised");
  }

  const dayChange = normalised.day_change;
  assert.strictEqual(dayChange.price_change_native, 0.42);
  assert.strictEqual(dayChange.price_change_eur, 0.39);
  assert.strictEqual(dayChange.change_pct, 0.38);
  assert.strictEqual(dayChange.source, "derived");
  assert.strictEqual(dayChange.coverage_ratio, 0.5);
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

void test("normalizePerformancePayload rejects partially numeric strings", () => {
  const payload = normalizePerformancePayload({
    gain_abs: "123abc",
    gain_pct: "12.3%",
    total_change_eur: "1,234",
    total_change_pct: "5.6e2foo",
    day_change: {
      price_change_native: "7.8 EUR",
    },
  });

  assert.strictEqual(payload, null);
});
