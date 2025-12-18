
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { installDomEnvironment } from './dom';

describe('toErrorMessage XSS Safety', () => {
  let toErrorMessage: (error: unknown) => string;

  before(async () => {
    installDomEnvironment();
    // Polyfill customElements for the module load
    (global as any).customElements = {
        get: () => undefined,
        define: () => undefined,
    };

    // Import after DOM is ready
    const module = await import('../dashboard');
    toErrorMessage = module.__TEST_ONLY_DASHBOARD.toErrorMessage;
  });

  it('should escape HTML characters in error strings', () => {
    const malicious = '<img src=x onerror=alert(1)>';
    const result = toErrorMessage(malicious);

    assert.strictEqual(result.includes('<img'), false, 'Should not contain raw HTML tags');
    assert.strictEqual(result.includes('&lt;img'), true, 'Should contain escaped HTML tags');
  });

  it('should escape HTML in Error messages', () => {
    const error = new Error('<script>alert(1)</script>');
    const result = toErrorMessage(error);
    assert.strictEqual(result.includes('<script>'), false);
    assert.strictEqual(result.includes('&lt;script&gt;'), true);
  });
});
