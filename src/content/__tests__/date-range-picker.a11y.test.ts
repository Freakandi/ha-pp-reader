
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { DateRangePicker } from '../date-range-picker';
import { installDomEnvironment, InstalledDomEnvironment } from '../../__tests__/dom';

describe('DateRangePicker A11y', () => {
    let env: InstalledDomEnvironment;
    let container: HTMLElement;

    beforeEach(() => {
        env = installDomEnvironment();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (global as any).requestAnimationFrame = (callback: FrameRequestCallback) => {
            return setTimeout(callback, 0);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (global as any).cancelAnimationFrame = (id: number) => {
            clearTimeout(id);
        };

        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        if (container) container.remove();
        env.restore();
    });

    it('should have aria-selected attributes on day cells and correct roles', () => {
        const picker = new DateRangePicker(container, {
            initialRange: {
                start: new Date(2024, 0, 1), // Jan 1 2024
                end: new Date(2024, 0, 5)    // Jan 5 2024
            }
        });

        // Open the picker to render calendars
        const trigger = container.querySelector('.drp-trigger') as HTMLElement;
        trigger.click();

        const grid = document.querySelector('.drp-days-grid');
        assert.strictEqual(grid?.getAttribute('role'), 'listbox', 'Grid should have role="listbox"');

        // Find the start date cell (Jan 1)
        const days = Array.from(document.querySelectorAll('.drp-day'));
        const startCell = days.find(d => d.textContent === '1' && d.classList.contains('range-start'));
        const endCell = days.find(d => d.textContent === '5' && d.classList.contains('range-end'));
        const middleCell = days.find(d => d.textContent === '3');

        assert.ok(startCell, 'Start cell should exist');
        assert.ok(endCell, 'End cell should exist');
        assert.ok(middleCell, 'Middle cell should exist');

        assert.strictEqual(startCell?.getAttribute('role'), 'option', 'Day cell should have role="option"');
        assert.strictEqual(startCell?.getAttribute('aria-selected'), 'true', 'Start cell should have aria-selected="true"');
        assert.strictEqual(endCell?.getAttribute('aria-selected'), 'true', 'End cell should have aria-selected="true"');
        assert.strictEqual(middleCell?.getAttribute('aria-selected'), 'false', 'Middle cell should have aria-selected="false"');
    });
});
