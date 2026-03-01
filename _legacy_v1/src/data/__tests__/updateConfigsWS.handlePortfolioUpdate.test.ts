import test from 'node:test';
import assert from 'node:assert/strict';
import { installDomEnvironment } from '../../__tests__/dom';
import { handlePortfolioUpdate } from '../updateConfigsWS';
import { __TEST_ONLY__ as storeTestHelpers } from '../../lib/store/portfolioStore';

const TABLE_MARKUP = `
<!doctype html>
<html>
  <body>
    <div id="root">
      <div class="portfolio-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Anzahl Positionen</th>
              <th>Kaufwert</th>
              <th>Aktueller Wert</th>
              <th>Heute +/-</th>
              <th>Heute %</th>
              <th>Gesamt +/-</th>
              <th>Gesamt %</th>
            </tr>
          </thead>
          <tbody>
            <tr class="portfolio-row" data-portfolio="portfolio-1" data-fx-unavailable="false">
              <td><button class="portfolio-toggle" data-portfolio="portfolio-1">Test Depot</button></td>
              <td class="align-right">1</td>
              <td class="align-right">10,00&nbsp;&euro;</td>
              <td class="align-right">20,00&nbsp;&euro;</td>
              <td class="align-right"><span class="positive">1,00&nbsp;&euro;</span></td>
              <td class="align-right"><span class="positive">0,10&nbsp;%</span></td>
              <td class="align-right" data-gain-pct="0,20 %" data-gain-sign="positive"><span class="positive">2,00&nbsp;&euro;</span></td>
              <td class="align-right gain-pct-cell"><span class="positive">0,20&nbsp;%</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </body>
</html>
`;

void test('handlePortfolioUpdate keeps day change columns aligned with updated payloads', () => {
  storeTestHelpers.reset();
  const env = installDomEnvironment(TABLE_MARKUP);

  try {
    const root = env.document.getElementById('root');
    assert.ok(root);

    handlePortfolioUpdate(
      [
        {
          uuid: 'portfolio-1',
          name: 'Test Depot',
          position_count: 10,
          purchase_sum: 1000,
          current_value: 1200,
          performance: {
            gain_abs: 200,
            gain_pct: 20,
            total_change_eur: 200,
            total_change_pct: 20,
            day_change: {
              value_change_eur: 5,
              change_pct: 0.42,
            },
          },
        },
      ],
      root,
    );

    const row = root.querySelector<HTMLTableRowElement>('tr.portfolio-row');
    assert.ok(row);

    const cells = row.cells;
    assert.ok(cells.item(2)?.innerHTML.includes('1.000,00'));
    assert.ok(cells.item(3)?.innerHTML.includes('1.200,00'));

    const dayChangeAbsHtml = cells.item(4)?.innerHTML ?? '';
    assert.ok(dayChangeAbsHtml.includes('5,00'));
    assert.ok(dayChangeAbsHtml.includes('\u20ac'));
    assert.ok(!dayChangeAbsHtml.includes('%'));

    const dayChangePctHtml = cells.item(5)?.innerHTML ?? '';
    assert.ok(dayChangePctHtml.includes('0,42'));
    assert.ok(dayChangePctHtml.includes('%'));

    assert.strictEqual(row.dataset.dayChange, '5');
    assert.ok((row.dataset.dayChangePct ?? '').startsWith('0.42'));
    assert.strictEqual(row.dataset.currentValue, '1200');
    assert.strictEqual(row.dataset.purchaseSum, '1000');
  } finally {
    env.restore();
    storeTestHelpers.reset();
  }
});
