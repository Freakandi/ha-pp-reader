import { describe, it } from "node:test";
import assert from "node:assert";
import { __TEST_ONLY__ } from "../time_series";
import type { DailyWealthRecord, DailyWealthResponse } from "../../data/api";

const { derivePerformanceForTest } = __TEST_ONLY__;

describe("derivePerformance", () => {
  const records: DailyWealthRecord[] = [
    {
      date: "2023-01-01",
      total_wealth_eur: 1000,
      portfolio_wealth_eur: 500,
      account_wealth_eur: 500,
      unrealized_gains_eur: 0,
      unrealized_price_gains_eur: 0,
      realized_gains_eur: 0,
    },
    {
      date: "2023-01-31",
      total_wealth_eur: 1100,
      portfolio_wealth_eur: 600,
      account_wealth_eur: 500,
      unrealized_gains_eur: 50,
      unrealized_price_gains_eur: 40,
      realized_gains_eur: 10,
      dividends_eur: 5,
      interest_eur: 2,
      fees_eur: 3,
      taxes_eur: 1,
      inbound_transfers_eur: 0,
      outbound_transfers_eur: 0,
      performance_neutral_movements: 0,
    },
  ];

  it("uses client-side calculation when metrics are missing", () => {
    const result = derivePerformanceForTest(records, undefined);
    assert.ok(result);
    // Market Gain = Realized (10) + Unrealized Delta (50 - 0) = 60
    assert.strictEqual(result.marketGain, 60);
    // FX = Total Delta (100) - Market (60) - Ertraege (7) - Fees (-3) - Taxes (-1)
    // 100 - 60 - 7 - (-3) - (-1) = 100 - 60 - 7 + 3 + 1 = 37 ?
    // Formula: fxGains = totalPerformance - marketGain - ertraege - fees - taxes;
    // Total Perf = 100
    // Fees are NEGATIVE in sumField if inputs are positive?
    // In code: fees = -Math.abs(sumField(...))
    // sumField('fees_eur') = 3. so fees = -3.
    // taxes = -1.
    // fx = 100 - 60 - 7 - (-3) - (-1) = 37.
    assert.strictEqual(result.fxGains, 37);
  });

  it("uses API metrics when provided", () => {
    const metrics: DailyWealthResponse["metrics"] = {
      absolute_performance: 999, // Unused in derivePerformance currently
      realized_gains: 200,
      unrealized_gains: 100,
      fx_gains_cash: 500,
    };

    const result = derivePerformanceForTest(records, metrics);
    assert.ok(result);

    // Should use the metrics values
    assert.strictEqual(result.realizedGains, 200);
    assert.strictEqual(result.unrealizedGains, 100);
    // Market Gain = 200 + 100 = 300
    assert.strictEqual(result.marketGain, 300);
    // FX Gains = 500
    assert.strictEqual(result.fxGains, 500);
  });
});
