
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { handlePortfolioPositionsUpdate } from '../updateConfigsWS';

// Mock dependencies (if needed, but we are using JSDOM for most parts)

describe('updateConfigsWS XSS vulnerability', () => {
  it('should escape portfolioUuid in error message', () => {
    // We intentionally create a mock root object that bypasses the `querySelector` syntax validation
    // to simulate what would happen if the DOM lookup logic changed (e.g., to `getElementById` or a Map lookup),
    // or if `CSS.escape` was used in the selector.
    // The goal is to prove `renderPositionsError` generates unsafe HTML.

    const maliciousUuid = '"><script>alert(1)</script>';

    const containerMock = {
        innerHTML: '',
        dataset: {}
    };

    const detailsRowMock = {
        querySelector: (sel: string) => sel === '.positions-container' ? containerMock : null,
        classList: { contains: () => false }
    };

    const rootMock = {
        querySelector: (_sel: string) => {
             // Return our mock row regardless of the selector
             return detailsRowMock;
        }
    };

    const update = {
        portfolio_uuid: maliciousUuid,
        error: 'Test Error'
    };

    // Cast to any to bypass strict type check for the mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    handlePortfolioPositionsUpdate(update, rootMock as any);

    // Check if the UUID was escaped in the output HTML
    // We expect &quot; instead of "
    assert.ok(containerMock.innerHTML.includes('data-portfolio="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"'), 'Attribute value should be escaped');
    assert.ok(!containerMock.innerHTML.includes('data-portfolio=""><script>alert(1)</script>"'), 'Should not contain raw XSS payload');
  });
});
