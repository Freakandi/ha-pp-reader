/**
 * Fügt einem Element Swipe- und Maus-Events hinzu, um zwischen Tabs zu navigieren.
 * @param {HTMLElement} element - Das Element, das die Events erhalten soll.
 * @param {Function} onSwipeLeft - Callback für Swipe/Klick nach links (nächster Tab).
 * @param {Function} onSwipeRight - Callback für Swipe/Klick nach rechts (vorheriger Tab).
 */
export function addSwipeEvents(element, onSwipeLeft, onSwipeRight) {
  let startX = null;

  // Touch-Events für Mobilgeräte
  element.addEventListener(
    'touchstart',
    e => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
      }
    },
    { passive: true } // Passive Listener für bessere Performance
  );

  element.addEventListener(
    'touchend',
    e => {
      if (startX === null) return;
      const deltaX = e.changedTouches[0].clientX - startX;
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
    e => {
      startX = e.clientX;
    },
    { passive: true } // Passive Listener für bessere Performance
  );

  element.addEventListener(
    'mouseup',
    e => {
      if (startX === null) return;
      const deltaX = e.clientX - startX;
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
export function goToTab(targetIndex, onTabChange) {
  if (typeof onTabChange === 'function') {
    onTabChange(targetIndex);
  }
}