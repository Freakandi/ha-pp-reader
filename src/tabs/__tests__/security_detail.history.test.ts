import test from 'node:test';
import assert from 'node:assert/strict';

import { __TEST_ONLY__ } from '../security_detail';
import { installDomEnvironment } from '../../__tests__/dom';
import type { HomeAssistant } from '../../types/home-assistant';

const {
  parseHistoryDateForTest,
  resolveRangeOptionsForTest,
  normaliseTransactionMarkersForTest,
} = __TEST_ONLY__;

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

test('normaliseTransactionMarkersForTest filters, maps types, and formats labels', () => {
  const markers = normaliseTransactionMarkersForTest(
    [
      {
        uuid: 'buy-1',
        type: 0,
        date: '2024-01-02',
        price: 120.43,
        shares: 20,
        currency_code: 'EUR',
      },
      {
        uuid: 'sell-1',
        type: 1,
        date: 2024_01_03,
        price: 150.5,
        shares: 5.5,
        net_price_eur: 148.25,
      },
      {
        uuid: 'outbound-1',
        type: 3,
        date: '2024-01-04',
        price: 50,
        shares: 1,
      },
      {
        uuid: 'ignored',
        type: 5,
        date: '2024-01-02',
        price: 10,
        shares: 1,
      },
      {
        uuid: 'missing-date',
        type: 0,
        price: 10,
        shares: 1,
      },
    ],
    'USD',
  );

  assert.strictEqual(markers.length, 3, 'only buy/sell/delivery markers with dates should be included');

  const buyMarker = markers.find((entry) => entry.id === 'buy-1');
  assert.ok(buyMarker, 'expected buy marker');
  assert.match(buyMarker?.label || '', /Kauf 20\b/, 'buy label should include share count');
  assert.match(buyMarker?.label || '', /120,43 EUR/, 'buy label should include native price and currency');

  const sellMarker = markers.find((entry) => entry.id === 'sell-1');
  assert.ok(sellMarker, 'expected sell marker');
  assert.match(sellMarker?.label || '', /Verkauf 5,50 @ 150,50 USD/, 'sell label should include price with fallback currency');
  assert.match(sellMarker?.label || '', /\(netto 148,25 EUR\)/, 'sell label should append net EUR price when available');

  const outboundMarker = markers.find((entry) => entry.id === 'outbound-1');
  assert.ok(outboundMarker, 'expected outbound delivery mapped to sale');
  assert.match(outboundMarker?.label || '', /Verkauf/, 'delivery type 3 should map to sale label');
});

void test('purchase markers are rendered after switching history ranges', async () => {
  const env = installDomEnvironment();
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
  const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
  env.window.requestAnimationFrame = (callback: FrameRequestCallback): number =>
    env.window.setTimeout(() => {
      callback(env.window.performance.now());
    }, 0);
  env.window.cancelAnimationFrame = (handle: number): void => {
    env.window.clearTimeout(handle);
  };
  (globalThis as typeof globalThis & { requestAnimationFrame?: typeof env.window.requestAnimationFrame }).requestAnimationFrame =
    env.window.requestAnimationFrame.bind(env.window);
  (globalThis as typeof globalThis & { cancelAnimationFrame?: typeof env.window.cancelAnimationFrame }).cancelAnimationFrame =
    env.window.cancelAnimationFrame.bind(env.window);

  try {
    const hassStub = {
      panels: {},
      connection: {
        sendMessage: () => undefined,
        subscribeMessage: async () => () => undefined,
        subscribeEvents: async () => () => undefined,
        sendMessagePromise: async (payload: Record<string, unknown>) => {
          if (payload.type === 'pp_reader/get_security_history') {
            return {
              security_uuid: payload.security_uuid,
              prices: [
                { date: '2024-01-01', close: 100 },
                { date: '2024-01-02', close: 102 },
              ],
              transactions: [
                {
                  uuid: 'buy-marker',
                  type: 0,
                  date: '2024-01-02',
                  price: 101.5,
                  shares: 2,
                  currency_code: 'USD',
                },
              ],
            };
          }

          if (payload.type === 'pp_reader/get_security_snapshot') {
            return {
              security_uuid: payload.security_uuid,
              snapshot: {
                name: 'Marker Test',
                currency_code: 'USD',
                last_price_native: 102,
              },
            };
          }

          throw new Error(`Unexpected WebSocket payload: ${String(payload.type)}`);
        },
      },
    } as const;

    const { renderSecurityDetail } = await import('../security_detail');

    const root = env.document.createElement('div');
    env.document.body.appendChild(root);

    const markup = await renderSecurityDetail(
      root,
      hassStub as HomeAssistant,
      { entry_id: 'entry-1', config: { entry_id: 'entry-1' } },
      'security-markers',
    );
    root.innerHTML = markup;

    await new Promise((resolve) => setTimeout(resolve, 0));

    const rangeButton = root.querySelector<HTMLButtonElement>('button[data-range="6M"]');
    assert.ok(rangeButton, 'expected 6M range button to exist');
    rangeButton.click();

    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const chartContainer = root.querySelector<HTMLDivElement>('.line-chart-container');
    assert.ok(chartContainer, 'expected chart container after range change');
    const markers = (chartContainer as HTMLDivElement & { __chartState?: { markers?: unknown } })
      .__chartState?.markers;
    assert.ok(Array.isArray(markers), 'chart state markers should be an array');
    assert.strictEqual(markers.length, 1, 'chart should retain purchase marker after range switch');
    assert.match(markers[0]?.label ?? '', /Kauf/, 'marker label should describe purchase');
  } finally {
    globalThis.requestAnimationFrame = previousRequestAnimationFrame;
    globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
    env.restore();
  }
});
