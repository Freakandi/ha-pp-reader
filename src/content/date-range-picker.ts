
export interface DateRange {
    start: Date;
    end: Date;
}

export interface DateRangePickerOptions {
    initialRange?: DateRange;
    onChange?: (range: DateRange) => void;
    minDate?: Date;
    maxDate?: Date;
    presets?: { label: string; days: number }[];
}



export class DateRangePicker {
    private element: HTMLElement;
    private range: DateRange;
    private options: DateRangePickerOptions;

    // State
    private isOpen = false;
    private viewDate: Date; // The date determining which month is shown in the left calendar
    private tempRange: DateRange; // Range currently being selected in the picker

    // Elements
    private triggerEl!: HTMLElement;
    private popoverEl!: HTMLElement;
    private calendarsContainer!: HTMLElement;
    private startInput!: HTMLInputElement;
    private endInput!: HTMLInputElement;

    constructor(element: HTMLElement, options: DateRangePickerOptions) {
        this.element = element;
        this.options = {
            presets: [
                { label: 'Letzte 7 Tage', days: 7 },
                { label: 'Letzte 30 Tage', days: 30 },
                { label: 'Diesen Monat', days: 0 }, // Special handling
                { label: 'Letzten Monat', days: -1 }, // Special handling
                { label: 'Dieses Jahr', days: -365 }, // Special handling
            ],
            ...options,
        };

        // Initialize range
        const today = new Date();
        this.range = options.initialRange || {
            start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29),
            end: today,
        };
        this.tempRange = { ...this.range };
        this.viewDate = new Date(this.range.end.getFullYear(), this.range.end.getMonth() - 1, 1);

        this.render();
        this.bindEvents();
        this.updateTrigger();
    }

    private formatDisplayDate(date: Date): string {
        return date.toLocaleDateString('de-DE', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    private render() {
        this.element.classList.add('date-range-picker');

        // Trigger
        this.triggerEl = document.createElement('div');
        this.triggerEl.className = 'drp-trigger';
        this.triggerEl.innerHTML = `
      <svg class="drp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
      <span class="drp-label"></span>
    `;
        this.element.appendChild(this.triggerEl);

        // Popover
        this.popoverEl = document.createElement('div');
        this.popoverEl.className = 'drp-popover';

        // Sidebar
        const sidebar = document.createElement('div');
        sidebar.className = 'drp-sidebar';
        this.options.presets?.forEach(preset => {
            const btn = document.createElement('button');
            btn.className = 'drp-preset-btn';
            btn.textContent = preset.label;
            btn.addEventListener('click', () => { this.selectPreset(preset); });
            sidebar.appendChild(btn);
        });
        this.popoverEl.appendChild(sidebar);

        // Main Content
        const main = document.createElement('div');
        main.className = 'drp-main';

        // Calendars
        this.calendarsContainer = document.createElement('div');
        this.calendarsContainer.className = 'drp-calendars';
        main.appendChild(this.calendarsContainer);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'drp-footer';

        const inputs = document.createElement('div');
        inputs.className = 'drp-inputs';
        this.startInput = document.createElement('input');
        this.startInput.type = 'text';
        this.startInput.className = 'drp-date-input';
        this.startInput.readOnly = true; // For now

        this.endInput = document.createElement('input');
        this.endInput.type = 'text';
        this.endInput.className = 'drp-date-input';
        this.endInput.readOnly = true;

        const sep = document.createElement('span');
        sep.textContent = '–';

        inputs.appendChild(this.startInput);
        inputs.appendChild(sep);
        inputs.appendChild(this.endInput);

        const actions = document.createElement('div');
        actions.className = 'drp-actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'drp-btn drp-btn-cancel';
        cancelBtn.textContent = 'Abbrechen';
        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });

        const applyBtn = document.createElement('button');
        applyBtn.className = 'drp-btn drp-btn-apply';
        applyBtn.textContent = 'Übernehmen';
        applyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.apply();
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(applyBtn);

        footer.appendChild(inputs);
        footer.appendChild(actions);
        main.appendChild(footer);

        this.popoverEl.appendChild(main);
        this.element.appendChild(this.popoverEl);
    }

    private bindEvents() {
        this.triggerEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            // Note: In shadow DOM, event.target might be retargeted.
            // Using composedPath() is safer.
            const path = e.composedPath();
            if (this.isOpen && !path.includes(this.element)) {
                this.close();
            }
        });

        // Prevent closing when clicking inside popover
        this.popoverEl.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    private toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    private open() {
        this.isOpen = true;
        this.popoverEl.classList.add('open'); // Using class for display: flex
        this.triggerEl.classList.add('active');
        this.tempRange = { ...this.range };
        // Reset view date to end date
        this.viewDate = new Date(this.range.end.getFullYear(), this.range.end.getMonth() - 1, 1);
        this.renderCalendars();
        this.updateInputs();
    }

    private close() {
        this.isOpen = false;
        this.popoverEl.classList.remove('open'); // Removing class to hide
        // We can also force display none via style if needed, but class is cleaner
        this.popoverEl.style.display = '';
        this.triggerEl.classList.remove('active');
    }

    private apply() {
        this.range = { ...this.tempRange };
        this.updateTrigger();
        this.close();
        if (this.options.onChange) {
            this.options.onChange(this.range);
        }
    }

    private updateTrigger() {
        const label = this.triggerEl.querySelector('.drp-label');
        if (label) {
            label.textContent = `${this.formatDisplayDate(this.range.start)} – ${this.formatDisplayDate(this.range.end)}`;
        }
    }

    private updateInputs() {
        this.startInput.value = this.formatDisplayDate(this.tempRange.start);
        this.endInput.value = this.formatDisplayDate(this.tempRange.end);
    }

    private selectPreset(preset: { label: string; days: number }) {
        const end = new Date();
        // Reset time to midnight
        end.setHours(0, 0, 0, 0);

        let start = new Date(end);

        if (preset.label === 'Diesen Monat') {
            start = new Date(end.getFullYear(), end.getMonth(), 1);
        } else if (preset.label === 'Letzten Monat') {
            start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
            end.setDate(0); // Last day of previous month
        } else if (preset.label === 'Dieses Jahr') {
            start = new Date(end.getFullYear(), 0, 1);
        } else {
            start.setDate(end.getDate() - (preset.days - 1));
        }

        this.tempRange = { start, end };
        this.viewDate = new Date(end.getFullYear(), end.getMonth() - 1, 1);
        this.renderCalendars();
        this.updateInputs();

        // Highlight active preset
        this.popoverEl.querySelectorAll('.drp-preset-btn').forEach(btn => {
            if (btn.textContent === preset.label) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }

    private renderCalendars() {
        this.calendarsContainer.innerHTML = '';

        // Left Calendar (viewDate)
        this.renderCalendar(this.viewDate, 'left');

        // Right Calendar (viewDate + 1 month)
        const nextMonth = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
        this.renderCalendar(nextMonth, 'right');
    }

    private renderCalendar(date: Date, position: 'left' | 'right') {
        const year = date.getFullYear();
        const month = date.getMonth();

        const calendarEl = document.createElement('div');
        calendarEl.className = 'drp-calendar';

        // Header
        const header = document.createElement('div');
        header.className = 'drp-calendar-header';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'drp-nav-btn';
        prevBtn.innerHTML = '‹';
        // Only show prev on left calendar
        if (position === 'left') {
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewDate.setMonth(this.viewDate.getMonth() - 1);
                this.renderCalendars();
            });
        } else {
            prevBtn.style.visibility = 'hidden';
        }

        const title = document.createElement('span');
        title.className = 'drp-month-label';
        title.textContent = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

        const nextBtn = document.createElement('button');
        nextBtn.className = 'drp-nav-btn';
        nextBtn.innerHTML = '›';
        // Only show next on right calendar
        if (position === 'right') {
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewDate.setMonth(this.viewDate.getMonth() + 1);
                this.renderCalendars();
            });
        } else {
            nextBtn.style.visibility = 'hidden';
        }

        header.appendChild(prevBtn);
        header.appendChild(title);
        header.appendChild(nextBtn);
        calendarEl.appendChild(header);

        // Weekdays
        const daysHeader = document.createElement('div');
        daysHeader.className = 'drp-days-header';
        ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].forEach(d => {
            const span = document.createElement('span');
            span.className = 'drp-day-name';
            span.textContent = d;
            daysHeader.appendChild(span);
        });
        calendarEl.appendChild(daysHeader);

        // Days Grid
        const grid = document.createElement('div');
        grid.className = 'drp-days-grid';

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Adjust for Monday start (0=Sun, 1=Mon, ..., 6=Sat)
        let startDayIdx = firstDay.getDay() - 1; // Mon=0
        if (startDayIdx < 0) startDayIdx = 6; // Sun=6

        // Empty cells before
        for (let i = 0; i < startDayIdx; i++) {
            const cell = document.createElement('div');
            cell.className = 'drp-day empty';
            grid.appendChild(cell);
        }

        // Days
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const current = new Date(year, month, d);
            const cell = document.createElement('div');
            cell.className = 'drp-day';
            cell.textContent = d.toString();

            this.applyDayClasses(cell, current);

            cell.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleDayClick(current);
            });

            cell.addEventListener('mouseenter', () => {
                this.handleDayHover(current);
            });

            grid.appendChild(cell);
        }

        calendarEl.appendChild(grid);
        this.calendarsContainer.appendChild(calendarEl);
    }

    private applyDayClasses(cell: HTMLElement, date: Date) {
        const t = date.getTime();
        const start = this.tempRange.start.getTime();
        const end = this.tempRange.end.getTime();

        if (t === start) cell.classList.add('range-start');
        if (t === end) cell.classList.add('range-end');
        if (t > start && t < end) cell.classList.add('in-range');

        // Today
        const today = new Date();
        if (date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
            cell.style.fontWeight = 'bold';
        }
    }

    private handleDayClick(date: Date) {
        const t = date.getTime();
        const s = this.tempRange.start.getTime();
        const e = this.tempRange.end.getTime();

        if (s !== e) {
            // Complete range existed. Start new selection.
            this.tempRange = { start: date, end: date };
        } else {
            // Partial range (start only). Set end.
            if (t < s) {
                // Clicked before start -> make it new start
                this.tempRange = { start: date, end: date }; // Or swap? usually new start.
            } else {
                this.tempRange = { start: this.tempRange.start, end: date };
            }
        }

        this.updateInputs();
        this.renderCalendars();
    }

    private handleDayHover(_date: Date) {
        // Optional: Preview range
    }
}
