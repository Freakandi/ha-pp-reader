/**
 * Swipe and tab interaction helpers mirrored from the legacy UI.
 */

/**
 * Fügt einem Element Swipe- und Maus-Events hinzu, um zwischen Tabs zu navigieren.
 * @param {HTMLElement} element - Das Element, das die Events erhalten soll.
 * @param {Function} onSwipeLeft - Callback für Swipe/Klick nach links (nächster Tab).
 * @param {Function} onSwipeRight - Callback für Swipe/Klick nach rechts (vorheriger Tab).
 */
export function addSwipeEvents(
  element: HTMLElement,
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
): void {
  let startX: number | null = null;

  // Touch-Events für Mobilgeräte
  element.addEventListener(
    'touchstart',
    event => {
      if (event.touches.length === 1) {
        startX = event.touches[0].clientX;
      }
    },
    { passive: true } // Passive Listener für bessere Performance
  );

  element.addEventListener(
    'touchend',
    event => {
      if (startX === null) return;
      const deltaX = event.changedTouches[0].clientX - startX;
      if (deltaX < -50) {
        onSwipeLeft();
      } else if (deltaX > 50) {
        onSwipeRight();
      }
      startX = null;
    },
    { passive: true } // Passive Listener für bessere Performance
  );

  // Maus-Events für Desktop
  element.addEventListener(
    'mousedown',
    event => {
      startX = event.clientX;
    },
    { passive: true } // Passive Listener für bessere Performance
  );

  element.addEventListener(
    'mouseup',
    event => {
      if (startX === null) return;
      const deltaX = event.clientX - startX;
      if (deltaX < -50) {
        onSwipeLeft();
      } else if (deltaX > 50) {
        onSwipeRight();
      }
      startX = null;
    },
    { passive: true } // Passive Listener für bessere Performance
  );
}

/**
 * Optional: Funktion zum direkten Wechseln zu einem Tab per Index.
 * @param {number} targetIndex - Der Index des gewünschten Tabs.
 * @param {Function} onTabChange - Callback, der beim Wechsel aufgerufen wird.
 */
export function goToTab(
  targetIndex: number,
  onTabChange?: (index: number) => void,
): void {
  if (onTabChange) {
    onTabChange(targetIndex);
  }
}