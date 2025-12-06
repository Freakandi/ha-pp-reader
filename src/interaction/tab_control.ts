/**
 * Swipe and tab interaction helpers mirrored from the legacy UI.
 */

export type SwipeCallback = () => void;

const DEFAULT_SWIPE_THRESHOLD = 50;

type SwipeDirection = 'left' | 'right';

function triggerSwipe(direction: SwipeDirection, callback: SwipeCallback): void {
  try {
    callback();
  } catch (error) {
    console.warn(`addSwipeEvents: ${direction} handler threw`, error);
  }
}

export function addSwipeEvents(
  element: HTMLElement,
  onSwipeLeft: SwipeCallback,
  onSwipeRight: SwipeCallback,
): void {
  let startX: number | null = null;

  const handleSwipe = (deltaX: number): void => {
    if (deltaX < -DEFAULT_SWIPE_THRESHOLD) {
      triggerSwipe('left', onSwipeLeft);
    } else if (deltaX > DEFAULT_SWIPE_THRESHOLD) {
      triggerSwipe('right', onSwipeRight);
    }
  };

  const handleTouchStart = (event: TouchEvent): void => {
    if (event.touches.length === 1) {
      startX = event.touches[0].clientX;
    }
  };

  const handleTouchEnd = (event: TouchEvent): void => {
    if (startX === null) {
      return;
    }
    if (event.changedTouches.length === 0) {
      startX = null;
      return;
    }
    const touch = event.changedTouches[0];
    handleSwipe(touch.clientX - startX);
    startX = null;
  };

  const handleMouseDown = (event: MouseEvent): void => {
    startX = event.clientX;
  };

  const handleMouseUp = (event: MouseEvent): void => {
    if (startX === null) {
      return;
    }
    handleSwipe(event.clientX - startX);
    startX = null;
  };

  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchend', handleTouchEnd, { passive: true });
  element.addEventListener('mousedown', handleMouseDown);
  element.addEventListener('mouseup', handleMouseUp);
}

export function goToTab(targetIndex: number, onTabChange: (index: number) => void): void {
  onTabChange(targetIndex);
}
