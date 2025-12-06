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
  assert.strictEqual(account.orig_balance, 500);
  assert.strictEqual(account.fx_rate, 1);
  assert.strictEqual(account.fx_rate_source, 'fixtures');
  assert.strictEqual(account.fx_rate_timestamp, '2024-01-11T10:00:00Z');
  assert.strictEqual(account.provenance, 'snapshot');

  assert.strictEqual(normalizationFixture.portfolios.length, 1);
  const portfolio = normalizationFixture.portfolios[0];
  assert.strictEqual(portfolio.uuid, 'port-smoke');
  assert.strictEqual(portfolio.position_count, 1);
  assert.strictEqual(portfolio.current_value, 550);
  assert.strictEqual(portfolio.purchase_value, 500);
  assert.strictEqual(portfolio.provenance, 'cached');
  assert.strictEqual(portfolio.performance?.gain_abs, 50);
  assert.strictEqual(portfolio.performance?.gain_pct, 10);
  assert.ok(Array.isArray(portfolio.positions) && portfolio.positions.length === 1);

  const position = portfolio.positions![0];
  assert.strictEqual(position.security_uuid, 'sec-smoke');
  assert.strictEqual(position.current_holdings, 5);
  assert.strictEqual(position.current_value, 550);
  assert.strictEqual(position.purchase_value, 500);
  assert.strictEqual(position.performance?.gain_pct, 10);
  assert.strictEqual(position.aggregation?.total_holdings, 5);
  assert.strictEqual(position.aggregation?.purchase_total_account, 500);
  assert.strictEqual(position.average_cost?.security, 100);
  assert.strictEqual(position.average_cost?.account, 100);
  assert.strictEqual(position.average_cost?.eur, 100);
  assert.strictEqual(position.performance?.day_change?.price_change_native, 0.5);
  assert.strictEqual(position.performance?.day_change?.price_change_eur, 0.45);
  assert.strictEqual(position.performance?.day_change?.change_pct, 0.95);
});

test('diagnostics smoketest fixture keeps ingestion/metrics counts in sync', () => {
  const ingestion = diagnosticsFixture.ingestion ?? {};
  const processed = ingestion.processed_entities ?? {};
  assert.strictEqual(processed.accounts, 1);
  assert.strictEqual(processed.portfolios, 1);
  assert.strictEqual(processed.transactions, 2);
  assert.strictEqual(processed.transaction_units, 2);

  const enrichment = diagnosticsFixture.enrichment ?? {};
  assert.strictEqual(enrichment.available, true);
  assert.ok(enrichment.fx?.latest_rate_fetch);

  const metrics = diagnosticsFixture.metrics ?? {};
  assert.strictEqual(metrics.available, true);
  const latestRun = metrics.latest_run ?? {};
  assert.strictEqual(latestRun.run_uuid, 'run-normalization-smoke');

  const normalized = diagnosticsFixture.normalized_payload ?? {};
  assert.strictEqual(normalized.available, true);
  assert.strictEqual(normalized.account_count, 1);
  assert.strictEqual(normalized.portfolio_count, 1);
  const positionTotal = (normalized.portfolios ?? []).reduce(
    (acc: number, entry: { position_count?: number } | null) =>
      acc + (entry?.position_count ?? 0),
    0,
  );
  assert.strictEqual(positionTotal, 1);
});
