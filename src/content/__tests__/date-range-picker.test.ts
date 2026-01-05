
import { describe, it, after } from 'node:test';
import { JSDOM } from 'jsdom';
import assert from 'node:assert';
import { DateRangePicker } from '../date-range-picker.js';

describe('DateRangePicker Keyboard Navigation', () => {
    // Save original globals
    const originalDocument = global.document;
    const originalWindow = global.window;
    const originalHTMLElement = global.HTMLElement;
    const originalEvent = global.Event;
    const originalKeyboardEvent = global.KeyboardEvent;
    const originalRAF = global.requestAnimationFrame;

    // Setup DOM environment
    const dom = new JSDOM('<!DOCTYPE html><body><div id="picker"></div></body>');
    const { window } = dom;
    const { document, HTMLElement, Event, KeyboardEvent } = window;

    // Mock global objects
    global.document = document as any;
    global.window = window as any;
    global.HTMLElement = HTMLElement as any;
    global.Event = Event as any;
    global.KeyboardEvent = KeyboardEvent as any;
    global.requestAnimationFrame = (cb) => setTimeout(cb, 0) as any;

    after(() => {
        // Restore globals
        global.document = originalDocument;
        global.window = originalWindow;
        global.HTMLElement = originalHTMLElement;
        global.Event = originalEvent;
        global.KeyboardEvent = originalKeyboardEvent;
        global.requestAnimationFrame = originalRAF;
    });

    // Helper to trigger keydown
    function triggerKey(element: Element, key: string) {
        const event = new KeyboardEvent('keydown', {
            key,
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(event);
    }

    it('should navigate grid with arrow keys', () => {
        const el = document.getElementById('picker') as HTMLElement;
        const drp = new DateRangePicker(el, { initialRange: { start: new Date(), end: new Date() } });

        // Open picker to render calendars
        (drp as any).open();

        // Get the first grid (Left Calendar)
        const grid = document.querySelector('.drp-days-grid');
        assert.ok(grid, 'Grid should exist');

        const days = Array.from(grid.querySelectorAll('.drp-day:not(.empty)')) as HTMLElement[];
        assert.ok(days.length > 0, 'Should have days');
        assert.strictEqual(days[0].tabIndex, 0, 'Day should be focusable');

        // Verify focus works manually
        days[1].focus();
        assert.strictEqual(document.activeElement, days[1], 'Manual focus should work');

        // Reset to day 0
        days[0].focus();
        assert.strictEqual(document.activeElement, days[0], 'First day should be focused');

        // ArrowRight -> Next Day
        triggerKey(days[0], 'ArrowRight');

        assert.strictEqual(document.activeElement, days[1], 'Right arrow should move focus to next day');
    });
});
