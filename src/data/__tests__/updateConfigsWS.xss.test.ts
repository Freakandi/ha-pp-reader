import test from 'node:test';
import assert from 'node:assert/strict';
import { installDomEnvironment } from '../../__tests__/dom';
import { __TEST_ONLY__ } from '../updateConfigsWS';

// Define minimal types to satisfy the function signature
type PortfolioPositionRecord = {
  name: string;
  current_holdings: number | string;
  purchase_value: number | string;
  current_value: number | string;
  security_uuid?: string;
  performance?: unknown;
  aggregation?: unknown;
  average_cost?: unknown;
  currency_code?: string;
};

void test('renderPositionsTableInline escapes XSS in name', () => {
  const env = installDomEnvironment('<!doctype html><html><body></body></html>');
  // Mock global DOMParser which might be used inside
  global.DOMParser = env.window.DOMParser;

  try {
    const maliciousName = '<img src=x onerror=alert(1)>';
    const positions: PortfolioPositionRecord[] = [
      {
        name: maliciousName,
        current_holdings: 10,
        purchase_value: 100,
        current_value: 110,
      }
    ];

    // We access the internal function exposed via __TEST_ONLY__
    // @ts-ignore - accessing private export
    const html = __TEST_ONLY__.renderPositionsTableInline(positions);

    // Assert that the HTML is ESCAPED.
    // Normalized or not, the < should be &lt;
    assert.ok(html.includes('&lt;img'), 'Should contain escaped HTML (&lt;img)');
    assert.ok(!html.includes('<img'), 'Should NOT contain raw HTML tag (<img)');

  } finally {
    env.restore();
  }
});
