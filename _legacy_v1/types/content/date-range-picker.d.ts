export interface DateRange {
    start: Date;
    end: Date;
}
export interface DateRangePickerOptions {
    initialRange?: DateRange;
    onChange?: (range: DateRange) => void;
    minDate?: Date;
    maxDate?: Date;
    presets?: {
        label: string;
        days: number;
    }[];
}
export declare class DateRangePicker {
    private element;
    private range;
    private options;
    private isOpen;
    private viewDate;
    private tempRange;
    private previousFocus;
    private activeDropdown;
    private triggerEl;
    private popoverEl;
    private calendarsContainer;
    private startInput;
    private endInput;
    constructor(element: HTMLElement, options: DateRangePickerOptions);
    private formatDisplayDate;
    private render;
    private bindEvents;
    private toggle;
    private open;
    private close;
    private closeDropdown;
    private apply;
    private updateTrigger;
    private updateInputs;
    private selectPreset;
    private updatePresetState;
    private renderCalendars;
    private renderCalendar;
    private toggleMonthDropdown;
    private toggleYearDropdown;
    private applyDayClasses;
    private handleDayClick;
    private handleDayHover;
}
//# sourceMappingURL=date-range-picker.d.ts.map