/**
 * Unit tests for the dashboard currency helpers.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeCurrencyValue,
  normalizePercentValue,
  roundCurrency,
  toFiniteCurrency,
} from '../currency';

void test('toFiniteCurrency parses numbers and numeric strings', () => {
  assert.strictEqual(toFiniteCurrency(12.345), 12.345);
  assert.strictEqual(toFiniteCurrency('42.5'), 42.5);
  assert.strictEqual(toFiniteCurrency('  8  '), 8);
  assert.strictEqual(toFiniteCurrency('13.831,09'), 13831.09);
  assert.strictEqual(toFiniteCurrency('59,7602'), 59.7602);
  assert.strictEqual(toFiniteCurrency('1.234.567'), 1234567);
  assert.strictEqual(toFiniteCurrency('1,234'), 1234);
  assert.strictEqual(toFiniteCurrency('12,345,678 €'), 12345678);
  assert.strictEqual(toFiniteCurrency('0,123'), 0.123);
  assert.strictEqual(toFiniteCurrency('123456,789'), 123456.789);
  assert.strictEqual(toFiniteCurrency('1 234,56 €'), 1234.56);
  assert.strictEqual(toFiniteCurrency(''), null);
  assert.strictEqual(toFiniteCurrency('abc'), null);
  assert.strictEqual(toFiniteCurrency(null), null);
});

void test('roundCurrency rounds to the given precision and normalises -0', () => {
  assert.strictEqual(roundCurrency(1.234), 1.23);
  assert.strictEqual(roundCurrency(1.235), 1.24);
  assert.strictEqual(roundCurrency(-0.0001), 0);
  assert.strictEqual(roundCurrency('7.891', { decimals: 3 }), 7.891);
  assert.strictEqual(roundCurrency(undefined, { fallback: 0 }), 0);
  assert.strictEqual(roundCurrency('not-a-number'), null);
});

void test('normalizeCurrencyValue reuses the rounder and fallback handling', () => {
  assert.strictEqual(normalizeCurrencyValue(19.999), 20);
  assert.strictEqual(normalizeCurrencyValue('4.321'), 4.32);
  assert.strictEqual(normalizeCurrencyValue('13.831,09'), 13831.09);
  assert.strictEqual(normalizeCurrencyValue('59,7602'), 59.76);
  assert.strictEqual(normalizeCurrencyValue(null), null);
  assert.strictEqual(normalizeCurrencyValue(undefined, { fallback: 0 }), 0);
});

void test('normalizePercentValue mirrors the currency normaliser', () => {
  assert.strictEqual(normalizePercentValue(3.456), 3.46);
  assert.strictEqual(normalizePercentValue('2.5'), 2.5);
  assert.strictEqual(normalizePercentValue(''), null);
});
