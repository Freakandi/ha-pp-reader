
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
    private previousFocus: HTMLElement | null = null; // Element that had focus before opening
    private activeDropdown: HTMLElement | null = null;

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
        this.triggerEl.setAttribute('role', 'button');
        this.triggerEl.setAttribute('aria-expanded', 'false');
        this.triggerEl.setAttribute('aria-haspopup', 'dialog');
        this.triggerEl.setAttribute('tabindex', '0');
        this.triggerEl.innerHTML = `
      <svg class="drp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
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
        this.popoverEl.setAttribute('role', 'dialog');
        this.popoverEl.setAttribute('aria-modal', 'true');
        this.popoverEl.setAttribute('aria-label', 'Zeitraum wählen');

        // Sidebar
        const sidebar = document.createElement('div');
        sidebar.className = 'drp-sidebar';
        this.options.presets?.forEach(preset => {
            const btn = document.createElement('button');
            btn.className = 'drp-preset-btn';
            btn.textContent = preset.label;
            btn.setAttribute('aria-pressed', 'false');
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
        this.startInput.setAttribute('aria-label', 'Startdatum');

        this.endInput = document.createElement('input');
        this.endInput.type = 'text';
        this.endInput.className = 'drp-date-input';
        this.endInput.readOnly = true;
        this.endInput.setAttribute('aria-label', 'Enddatum');

        const sep = document.createElement('span');
        sep.textContent = '–';
        sep.setAttribute('aria-hidden', 'true');

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

        // We append popover to element to ensure it's in DOM,
        // but we use fixed positioning to escape overflow.
        this.element.appendChild(this.popoverEl);
    }

    private bindEvents() {
        const toggleHandler = (e: Event) => {
            e.stopPropagation();
            this.toggle();
        };

        this.triggerEl.addEventListener('click', toggleHandler);
        this.triggerEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleHandler(e);
            }
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            // Check if click is inside dropdown
            const path = e.composedPath();
            if (this.activeDropdown && path.includes(this.activeDropdown)) {
                return;
            }

            if (this.isOpen && !path.includes(this.element) && !path.includes(this.popoverEl)) {
                this.close();
            }
            if (this.activeDropdown) {
                this.closeDropdown();
            }
        });

        // Prevent closing when clicking inside popover
        this.popoverEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.activeDropdown) {
                this.closeDropdown();
            }
        });

        // Trap focus
        this.popoverEl.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                if (this.activeDropdown) {
                    this.closeDropdown();
                } else {
                    this.close();
                }
                return;
            }
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
        this.previousFocus = document.activeElement as HTMLElement;
        this.popoverEl.classList.add('open');
        this.popoverEl.style.display = 'flex';
        this.triggerEl.classList.add('active');
        this.triggerEl.setAttribute('aria-expanded', 'true');

        // Fix position using standard DOM methods
        const rect = this.triggerEl.getBoundingClientRect();
        const top = rect.bottom + 8;
        const left = rect.left;

        // We use viewport-relative coordinates because of position: fixed
        this.popoverEl.style.top = `${String(top)}px`;
        this.popoverEl.style.left = `${String(left)}px`;

        // Reset state
        this.tempRange = { ...this.range };
        this.viewDate = new Date(this.range.end.getFullYear(), this.range.end.getMonth() - 1, 1);
        this.renderCalendars();
        this.updateInputs();
        this.updatePresetState(null);

        // Move focus
        requestAnimationFrame(() => {
            const firstFocusable = this.popoverEl.querySelector(
                'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
            ) as HTMLElement;
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (firstFocusable) {
                firstFocusable.focus();
            }
        });
    }

    private close() {
        this.isOpen = false;
        this.closeDropdown();
        this.popoverEl.classList.remove('open');
        this.popoverEl.style.display = '';
        this.triggerEl.classList.remove('active');
        this.triggerEl.setAttribute('aria-expanded', 'false');

        if (this.previousFocus && document.body.contains(this.previousFocus)) {
            this.previousFocus.focus();
        }
        this.previousFocus = null;
    }

    private closeDropdown() {
        if (this.activeDropdown) {
            this.activeDropdown.remove();
            this.activeDropdown = null;
        }
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

        this.updatePresetState(preset.label);
    }

    private updatePresetState(activeLabel: string | null) {
        this.popoverEl.querySelectorAll('.drp-preset-btn').forEach(btn => {
            const isActive = btn.textContent === activeLabel;
            if (isActive) {
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            }
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
        prevBtn.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
            </svg>
        `;
        prevBtn.setAttribute('aria-label', 'Vorheriger Monat');

        if (position === 'left') {
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeDropdown();
                this.viewDate.setMonth(this.viewDate.getMonth() - 1);
                this.renderCalendars();
            });
        } else {
            prevBtn.style.visibility = 'hidden';
        }

        // Title with Dropdowns
        const titleContainer = document.createElement('div');
        titleContainer.className = 'drp-title-container';
        titleContainer.style.display = 'flex';
        titleContainer.style.alignItems = 'center';
        titleContainer.style.gap = '4px';

        // Month Button
        const monthContainer = document.createElement('div');
        monthContainer.className = 'drp-dropdown-container';
        const monthBtn = document.createElement('button');
        monthBtn.className = 'drp-header-btn';
        monthBtn.innerHTML = `<span>${date.toLocaleDateString('de-DE', { month: 'long' })}</span> <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>`;
        monthBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleMonthDropdown(monthContainer, date.getMonth(), (newMonth) => {
                const targetYear = date.getFullYear();
                this.viewDate = new Date(targetYear, newMonth, 1);
                this.renderCalendars();
            });
        };
        monthContainer.appendChild(monthBtn);

        // Year Button
        const yearContainer = document.createElement('div');
        yearContainer.className = 'drp-dropdown-container';
        const yearBtn = document.createElement('button');
        yearBtn.className = 'drp-header-btn';
        yearBtn.innerHTML = `<span>${String(date.getFullYear())}</span> <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>`;
        yearBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleYearDropdown(yearContainer, date.getFullYear(), (newYear) => {
                // Keep month, change year
                // If it's right calendar, we also want to jump to that year as viewDate
                // Simple assumption: jump to that year/month
                const targetMonth = date.getMonth();
                this.viewDate = new Date(newYear, targetMonth, 1);
                this.renderCalendars();
            });
        };
        yearContainer.appendChild(yearBtn);

        titleContainer.appendChild(monthContainer);
        titleContainer.appendChild(yearContainer);


        const nextBtn = document.createElement('button');
        nextBtn.className = 'drp-nav-btn';
        nextBtn.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path>
            </svg>
        `;
        nextBtn.setAttribute('aria-label', 'Nächster Monat');

        if (position === 'right') {
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeDropdown();
                this.viewDate.setMonth(this.viewDate.getMonth() + 1);
                this.renderCalendars();
            });
        } else {
            nextBtn.style.visibility = 'hidden';
        }

        header.appendChild(prevBtn);
        header.appendChild(titleContainer);
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
        const today = new Date();
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const current = new Date(year, month, d);
            const cell = document.createElement('div');
            cell.className = 'drp-day';
            cell.textContent = d.toString();
            cell.setAttribute('role', 'button');
            cell.tabIndex = 0;

            // Labels and A11y
            let label = current.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            if (current.getDate() === today.getDate() && current.getMonth() === today.getMonth() && current.getFullYear() === today.getFullYear()) {
                cell.setAttribute('aria-current', 'date');
                label = `Heute, ${label}`;
            }
            const t = current.getTime();
            const s = this.tempRange.start.getTime();
            const e = this.tempRange.end.getTime();
            if (t === s) label += ' (Startdatum)';
            else if (t === e) label += ' (Enddatum)';
            else if (t > s && t < e) label += ' (im Zeitraum)';
            cell.setAttribute('aria-label', label);

            this.applyDayClasses(cell, current);

            cell.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleDayClick(current);
            });

            cell.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleDayClick(current);
                }
            });

            cell.addEventListener('mouseenter', () => {
                this.handleDayHover(current);
            });

            grid.appendChild(cell);
        }

        calendarEl.appendChild(grid);
        this.calendarsContainer.appendChild(calendarEl);
    }

    private toggleMonthDropdown(container: HTMLElement, currentMonth: number, onSelect: (m: number) => void) {
        if (this.activeDropdown && container.contains(this.activeDropdown)) {
            this.closeDropdown();
            return;
        }
        this.closeDropdown();

        const dropdown = document.createElement('div');
        dropdown.className = 'drp-dropdown';

        const months = [
            'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
            'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
        ];

        months.forEach((m, idx) => {
            const item = document.createElement('button');
            item.className = 'drp-dropdown-item';
            if (idx === currentMonth) {
                item.classList.add('selected');
            }
            item.textContent = m;
            item.onclick = (e) => {
                e.stopPropagation();
                this.closeDropdown();
                onSelect(idx);
            };
            dropdown.appendChild(item);
        });

        container.appendChild(dropdown);
        this.activeDropdown = dropdown;

        const selected = dropdown.querySelector('.selected');
        if (selected) {
            setTimeout(() => {
                selected.scrollIntoView({ block: 'center' });
            }, 0);
        }
    }

    private toggleYearDropdown(container: HTMLElement, currentYear: number, onSelect: (y: number) => void) {
        if (this.activeDropdown && container.contains(this.activeDropdown)) {
            this.closeDropdown();
            return;
        }
        this.closeDropdown();

        const dropdown = document.createElement('div');
        dropdown.className = 'drp-dropdown';

        // Range: +/- 100 years? User said "scroll to even earlier".
        // Let's generate a dynamic range or a fixed large range.
        // 1990 to 2050 covers most.
        // Or better: center around current.
        const startYear = currentYear - 50;
        const endYear = currentYear + 20;

        for (let y = startYear; y <= endYear; y++) {
            const item = document.createElement('button');
            item.className = 'drp-dropdown-item';
            if (y === currentYear) {
                item.classList.add('selected');
            }
            item.textContent = y.toString();
            item.onclick = (e) => {
                e.stopPropagation();
                this.closeDropdown();
                onSelect(y);
            };
            dropdown.appendChild(item);
        }

        container.appendChild(dropdown);
        this.activeDropdown = dropdown;

        const selected = dropdown.querySelector('.selected');
        if (selected) {
            setTimeout(() => {
                selected.scrollIntoView({ block: 'center' });
            }, 0);
        }
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
        this.updatePresetState(null);
    }

    private handleDayHover(_date: Date) {
        // Optional: Preview range
    }
}
