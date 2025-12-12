import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import { installDomEnvironment } from '../../__tests__/dom';

describe('XSS Vulnerability Check', () => {
    let domEnv: ReturnType<typeof installDomEnvironment>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderPortfolioPositions: any;

    before(async () => {
        domEnv = installDomEnvironment();
        // Polyfill customElements
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        (globalThis as any).customElements = (domEnv.window as any).customElements;
        // Polyfill Image for some other parts if needed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        (globalThis as any).Image = (domEnv.window as any).Image;

        // Dynamic import to ensure DOM is ready
        const module = await import('../overview');

        renderPortfolioPositions = module.renderPortfolioPositions;
    });

    after(() => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (domEnv) domEnv.restore();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        delete (globalThis as any).customElements;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        delete (globalThis as any).Image;
    });

    test('renderPortfolioPositions escapes XSS in name', () => {
        const maliciousName = '<img src=x onerror=alert(1)>';
        const positions = [{
            security_uuid: 'sec123',
            uuid: '123',
            name: maliciousName,
            current_holdings: 10,
            current_value: 100,
            purchase_value: 90
        }];

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const html = renderPortfolioPositions(positions) as string;

        // Vulnerable if html contains the raw tag
        assert.ok(!html.includes('<img src=x onerror=alert(1)>'), 'HTML should not contain raw malicious tag: ' + html);
        assert.ok(html.includes('&lt;img'), 'HTML should contain escaped tag');
    });
});
