/**
 * Swipe and tab interaction helpers mirrored from the legacy UI.
 */
export type SwipeCallback = () => void;
export declare function addSwipeEvents(element: HTMLElement, onSwipeLeft: SwipeCallback, onSwipeRight: SwipeCallback): void;
export declare function goToTab(targetIndex: number, onTabChange: (index: number) => void): void;
//# sourceMappingURL=tab_control.d.ts.map