
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { installDomEnvironment } from '../../__tests__/dom'; // Helper to setup JSDOM
import { DateRangePicker, DateRangePickerOptions } from '../date-range-picker';

describe('DateRangePicker', () => {
    // Setup DOM environment
    const { document, window } = installDomEnvironment();
    // Fix: Add HTMLElement to global for instanceof checks inside DateRangePicker logic if needed
    // (JSDOM usually handles this, but good to be safe)
    (global as any).HTMLElement = window.HTMLElement;
    (global as any).HTMLButtonElement = window.HTMLButtonElement;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0);

    it('should initialize with default options', () => {
        const root = document.createElement('div');
        new DateRangePicker(root, {});
        assert.ok(root.classList.contains('date-range-picker'));
        assert.ok(root.querySelector('.drp-trigger'));
    });

    it('should show preview range on hover when start date is selected', () => {
        const root = document.createElement('div');
        const picker = new DateRangePicker(root, {
             initialRange: { start: new Date(2023, 0, 1), end: new Date(2023, 0, 1) } // Start == End
        });

        // Open picker to render calendar
        (picker as any).open();

        // Simulate hover on Jan 5th
        const hoverDate = new Date(2023, 0, 5);
        (picker as any).handleDayHover(hoverDate);

        // Check internal state (hoverDate)
        assert.strictEqual((picker as any).hoverDate, hoverDate);

        // Check if classes are applied correctly
        const cells = Array.from(root.querySelectorAll('.drp-day'));

        // Jan 3rd should be in preview range
        const jan3rdCell = cells.find(cell => cell.textContent === '3' && cell.getAttribute('data-date'));
        // NOTE: With data-date now present, we can be surer, but textContent '3' is still simple check
        // Check if jan3rdCell exists and has class
        assert.ok(jan3rdCell?.classList.contains('in-range'), 'Jan 3rd should be in preview range');

        // Jan 10th should NOT be in preview range
        const jan10thCell = cells.find(cell => cell.textContent === '10' && cell.getAttribute('data-date'));
        assert.strictEqual(jan10thCell?.classList.contains('in-range'), false, 'Jan 10th should NOT be in preview range');
    });

    it('should NOT show preview range if start != end', () => {
        const root = document.createElement('div');
        const picker = new DateRangePicker(root, {
             initialRange: { start: new Date(2023, 0, 1), end: new Date(2023, 0, 10) } // Complete range
        });

        (picker as any).open();

        const hoverDate = new Date(2023, 0, 15);
        (picker as any).handleDayHover(hoverDate);

        // handleDayHover initializes hoverDate as null in constructor, so we check if it is null or undefined, but stricter check is good.
        // The previous test failed because it was null (set in ctor) vs undefined (expected).
        assert.strictEqual((picker as any).hoverDate, null, 'Hover date should not be set (should remain null)');

        const cells = Array.from(root.querySelectorAll('.drp-day'));
        const jan12thInRange = cells.some(cell => cell.textContent === '12' && cell.classList.contains('in-range'));
        assert.strictEqual(jan12thInRange, false, 'Jan 12th should not be in range just by hovering');
    });

    it('should not update if hovering same date (guard clause)', () => {
        const root = document.createElement('div');
        const picker = new DateRangePicker(root, {
             initialRange: { start: new Date(2023, 0, 1), end: new Date(2023, 0, 1) }
        });
        (picker as any).open();

        // Spy on updateVisibleDayClasses (simple way since it's private: overwrite it on instance)
        let callCount = 0;
        const originalUpdate = (picker as any).updateVisibleDayClasses.bind(picker);
        (picker as any).updateVisibleDayClasses = () => {
            callCount++;
            originalUpdate();
        };

        const hoverDate = new Date(2023, 0, 5);
        (picker as any).handleDayHover(hoverDate);
        assert.strictEqual(callCount, 1, 'First hover should trigger update');

        // Hover same date again (same timestamp)
        const sameDate = new Date(2023, 0, 5);
        (picker as any).handleDayHover(sameDate);
        assert.strictEqual(callCount, 1, 'Second hover on same date should NOT trigger update');

        // Hover different date
        const differentDate = new Date(2023, 0, 6);
        (picker as any).handleDayHover(differentDate);
        assert.strictEqual(callCount, 2, 'New date should trigger update');
    });
});
