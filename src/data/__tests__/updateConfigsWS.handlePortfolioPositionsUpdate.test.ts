import test from 'node:test';
import assert from 'node:assert/strict';

import { installDomEnvironment } from '../../__tests__/dom';
import { handlePortfolioPositionsUpdate } from '../updateConfigsWS';
import {
  clearAllPortfolioPositions,
  setPortfolioPositions,
  type PortfolioPositionRecord,
  hasPortfolioPositions,
} from '../positionsCache';
import { __TEST_ONLY__ as storeTestHelpers } from '../../lib/store/portfolioStore';
import { __TEST_ONLY__ as wsTestHelpers } from '../updateConfigsWS';

const POSITIONS_MARKUP = `
<!doctype html>
<html>
  <body>
    <div id="root">
      <div class="portfolio-table">
        <table>
          <tbody>
            <tr class="portfolio-details" data-portfolio="portfolio-1">
              <td colspan="9">
                <div class="positions-container"></div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </body>
</html>
`;

void test('handlePortfolioPositionsUpdate preserves cached metrics when push payloads are slim', async () => {
  storeTestHelpers.reset();
  clearAllPortfolioPositions();
  wsTestHelpers.clearPendingUpdates();
  const env = installDomEnvironment(POSITIONS_MARKUP);

  try {
    (globalThis as typeof globalThis & { CustomEvent?: typeof CustomEvent }).CustomEvent =
      env.window.CustomEvent as typeof CustomEvent;

    await import('../../tabs/overview');

    const root = env.document.getElementById('root');
    assert.ok(root);

    const basePosition: PortfolioPositionRecord = {
      portfolio_uuid: 'portfolio-1',
      security_uuid: 'security-1',
      name: 'Test Holding',
      currency_code: 'EUR',
      current_holdings: 5,
      purchase_value: 500,
      current_value: 750,
      average_cost: {
        native: 100,
        security: 100,
        account: 100,
        eur: 100,
        source: 'aggregation',
        coverage_ratio: 1,
      },
      performance: {
        gain_abs: 250,
        gain_pct: 50,
        total_change_eur: 250,
        total_change_pct: 50,
        source: 'derived',
        coverage_ratio: 1,
        day_change: {
          value_change_eur: 50,
          change_pct: 7.14,
          price_change_eur: 10,
          price_change_native: 10,
          source: 'derived',
          coverage_ratio: 1,
        },
      },
      last_price_eur: 150,
      last_close_eur: 140,
    };

    setPortfolioPositions('portfolio-1', [basePosition]);

    handlePortfolioPositionsUpdate(
      {
        portfolio_uuid: 'portfolio-1',
        positions: [
          {
            security_uuid: 'security-1',
            name: 'Test Holding',
            current_holdings: 5,
            purchase_value: 500,
            current_value: 800,
            performance: {
              gain_abs: 300,
              gain_pct: 60,
            },
          },
        ],
      },
      root,
    );

    const firstRow = root.querySelector<HTMLTableRowElement>(
      '.positions-container tbody tr',
    );
    assert.ok(firstRow);

    const avgPriceCell = firstRow.cells.item(2);
    assert.ok(avgPriceCell);
    assert.ok(
      (avgPriceCell.textContent ?? '').includes('100'),
      'average price should be sourced from cached payload',
    );

    const dayChangeCell = firstRow.cells.item(5);
    assert.ok(dayChangeCell);
    const dayChangeText = dayChangeCell.textContent ?? '';
    assert.ok(!dayChangeText.includes('—'), 'day change should remain populated');
    assert.ok(dayChangeText.includes('€'));

    const gainPctCell = firstRow.cells.item(8);
    assert.ok(gainPctCell);
    assert.ok(
      (gainPctCell.textContent ?? '').includes('%'),
      'gain percentage should remain available',
    );
  } finally {
    env.restore();
    clearAllPortfolioPositions();
    wsTestHelpers.clearPendingUpdates();
    storeTestHelpers.reset();
  }
});

const COLLAPSED_MARKUP = `
<!doctype html>
<html>
  <body>
    <div id="root">
      <div class="portfolio-table">
        <table>
          <tbody>
            <tr class="portfolio-details hidden" data-portfolio="portfolio-1">
              <td colspan="9">
                <div class="positions-container"></div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </body>
</html>
`;

void test('collapsed portfolios skip partial push renders until expanded', () => {
  storeTestHelpers.reset();
  clearAllPortfolioPositions();
  wsTestHelpers.clearPendingUpdates();

  const env = installDomEnvironment(COLLAPSED_MARKUP);
  (globalThis as typeof globalThis & { CustomEvent?: typeof CustomEvent }).CustomEvent =
    env.window.CustomEvent as typeof CustomEvent;

  try {
    const root = env.document.getElementById('root');
    assert.ok(root);

    handlePortfolioPositionsUpdate(
      {
        portfolio_uuid: 'portfolio-1',
        positions: [
          {
            security_uuid: 'security-1',
            name: 'Test Holding',
            current_holdings: 1,
            purchase_value: 100,
            current_value: 110,
            performance: { gain_abs: 10, gain_pct: 10 },
          },
        ],
      },
      root,
    );

    assert.strictEqual(wsTestHelpers.getPendingUpdateCount(), 0);
    assert.strictEqual(hasPortfolioPositions('portfolio-1'), false);
  } finally {
    env.restore();
    clearAllPortfolioPositions();
    wsTestHelpers.clearPendingUpdates();
    storeTestHelpers.reset();
  }
});
