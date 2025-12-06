import assert from "node:assert";
import { afterEach, test } from "node:test";

import { getPortfolioPositions, setPortfolioPositions } from "../positionsCache";
import {
  __TEST_ONLY__ as portfolioStoreTestApi,
  getPortfolioSnapshot,
  replacePortfolioSnapshots,
  setPortfolioPositionsSnapshot,
} from "../../lib/store/portfolioStore";

afterEach(() => {
  setPortfolioPositions("portfolio-1", null);
  portfolioStoreTestApi.reset();
});

test("setPortfolioPositions merges partial updates with cached fields", () => {
  setPortfolioPositions("portfolio-1", [
    {
      portfolio_uuid: "portfolio-1",
      security_uuid: "sec-1",
      name: "Alpha",
      current_holdings: 1,
      purchase_value: 100,
      current_value: 110,
      performance: {
        gain_abs: 10,
        gain_pct: 10,
        total_change_eur: 10,
        total_change_pct: 10,
        source: "test",
        coverage_ratio: 1,
      },
      average_cost: {
        native: null,
        security: null,
        account: 5,
        eur: null,
        source: "totals",
        coverage_ratio: null,
      },
      aggregation: {
        total_holdings: 1,
        positive_holdings: 1,
        purchase_value_cents: 10_000,
        purchase_value_eur: 100,
        security_currency_total: 100,
        account_currency_total: 100,
        purchase_total_security: 100,
        purchase_total_account: 100,
      },
    },
  ]);

  setPortfolioPositions("portfolio-1", [
    {
      portfolio_uuid: "portfolio-1",
      security_uuid: "sec-1",
      current_holdings: 2,
      current_value: 120,
      performance: {
        gain_abs: 20,
        gain_pct: 20,
        total_change_eur: 20,
        total_change_pct: 20,
        source: "test",
        coverage_ratio: 1,
      },
    },
  ]);

  const positions = getPortfolioPositions("portfolio-1");
  assert.equal(positions.length, 1);
  const position = positions[0];
  assert.equal(position.name, "Alpha"); // preserved
  assert.equal(position.current_holdings, 2);
  assert.equal(position.current_value, 120);
  assert.equal(position.performance?.gain_abs, 20);
  assert.equal(position.performance?.gain_pct, 10); // preserved
  assert.equal(position.average_cost?.account, 5); // preserved
});

test("setPortfolioPositionsSnapshot merges patches to retain snapshot detail", () => {
  replacePortfolioSnapshots([
    {
      uuid: "portfolio-1",
      name: "Depot",
      current_value: 0,
      purchase_value: 0,
      position_count: 1,
      missing_value_positions: 0,
      performance: {},
    },
  ]);

  setPortfolioPositionsSnapshot("portfolio-1", [
    {
      portfolio_uuid: "portfolio-1",
      security_uuid: "sec-1",
      name: "Alpha",
      currency_code: "EUR",
      current_holdings: 1,
      purchase_value: 100,
      current_value: 110,
      performance: {
        gain_abs: 10,
        gain_pct: 10,
        total_change_eur: 10,
        total_change_pct: 10,
        source: "test",
        coverage_ratio: 1,
      },
      average_cost: {
        native: null,
        security: null,
        account: 5,
        eur: null,
        source: "totals",
        coverage_ratio: null,
      },
      aggregation: {
        total_holdings: 1,
        positive_holdings: 1,
        purchase_value_cents: 10_000,
        purchase_value_eur: 100,
        security_currency_total: 100,
        account_currency_total: 100,
        purchase_total_security: 100,
        purchase_total_account: 100,
      },
    },
  ]);

  setPortfolioPositionsSnapshot("portfolio-1", [
    {
      portfolio_uuid: "portfolio-1",
      security_uuid: "sec-1",
      current_value: 130,
      performance: {
        gain_abs: 30,
        gain_pct: 30,
        total_change_eur: 30,
        total_change_pct: 30,
        source: "test",
        coverage_ratio: 1,
      },
    },
  ]);

  const snapshot = getPortfolioSnapshot("portfolio-1");
  assert(snapshot);
  assert(snapshot.positions);
  assert.equal(snapshot.positions.length, 1);
  const pos = snapshot.positions[0];
  assert.equal(pos.name, "Alpha");
  assert.equal(pos.current_value, 130);
  assert.equal(pos.performance?.gain_abs, 30);
  assert.equal(pos.performance?.gain_pct, 10);
  assert.equal(pos.average_cost?.account, 5);
});
