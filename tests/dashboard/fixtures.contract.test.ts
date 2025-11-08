import assert from 'node:assert/strict';
import test from 'node:test';

import diagnosticsFixture from './fixtures/diagnostics_smoketest.json';
import normalizationFixture from './fixtures/normalization_smoketest_snapshot.json';

test('normalization smoketest fixture mirrors canonical IDs', () => {
  assert.strictEqual(normalizationFixture.metric_run_uuid, 'run-normalization-smoke');
  assert.strictEqual(normalizationFixture.accounts.length, 1);
  const account = normalizationFixture.accounts[0];
  assert.strictEqual(account.uuid, 'acc-smoke');
  assert.strictEqual(account.currency_code, 'EUR');
  assert.strictEqual(account.balance, 500);
  assert.strictEqual(account.coverage_ratio, 1);

  assert.strictEqual(normalizationFixture.portfolios.length, 1);
  const portfolio = normalizationFixture.portfolios[0];
  assert.strictEqual(portfolio.uuid, 'port-smoke');
  assert.strictEqual(portfolio.position_count, 1);
  assert.strictEqual(portfolio.performance?.gain_abs, 50);
  assert.strictEqual(portfolio.performance?.gain_pct, 10);
  assert.ok(Array.isArray(portfolio.positions) && portfolio.positions.length === 1);

  const position = portfolio.positions![0];
  assert.strictEqual(position.security_uuid, 'sec-smoke');
  assert.strictEqual(position.current_holdings, 5);
  assert.strictEqual(position.current_value, 550);
  assert.strictEqual(position.performance?.gain_pct, 10);
  assert.strictEqual(position.aggregation?.total_holdings, 5);
});

test('diagnostics smoketest fixture keeps ingestion/metrics counts in sync', () => {
  const ingestion = diagnosticsFixture.ingestion ?? {};
  assert.strictEqual(ingestion.ingestion_accounts, 1);
  assert.strictEqual(ingestion.ingestion_portfolios, 1);

  const metrics = diagnosticsFixture.metrics ?? {};
  assert.strictEqual(metrics.status, 'completed');
  assert.strictEqual(metrics.records?.portfolio_metrics, 1);
  assert.strictEqual(metrics.records?.account_metrics, 1);

  const normalization = diagnosticsFixture.normalization ?? {};
  assert.strictEqual(normalization.status, 'ok');
  assert.strictEqual(normalization.counts?.accounts, 1);
  assert.strictEqual(normalization.counts?.positions, 1);
});
