import { addSwipeEvents } from './interaction/tab_control.js';
import { renderDashboard } from './tabs/overview.js';
import { renderTestTab } from './tabs/test_tab.js';
import { initializeUpdateListeners, removeUpdateListeners } from './data/updateConfigsWS.js';

const tabs = [
  { title: 'Dashboard', render: renderDashboard },
  { title: 'Test Tab', render: renderTestTab }
];

let currentPage = 0;
let observer; // Globale Variable für Debugging

async function renderTab(root, hass, panel) {
  console.log("renderTab: Wird aufgerufen mit hass:", hass, "und panel:", panel);

  const tab = tabs[currentPage];
  if (!tab || !tab.render) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }

  let content;
  try {
    content = await tab.render(root, hass, panel); // Verwende die lokalen Parameter hass und panel
    console.log("renderTab: Tab-Inhalt erfolgreich gerendert.");
  } catch (error) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", error);
    return;
  }

  if (!root) {
    console.error("renderTab: Root-Element nicht gefunden!");
    return;
  }

  root.innerHTML = content;
  console.log("renderTab: Inhalt wurde erfolgreich in das Root-Element eingefügt.");

  // Warte, bis die `.header-card` im DOM verfügbar ist
  const waitForHeaderCard = () => new Promise((resolve) => {
    const interval = setInterval(() => {
      const headerCard = root.querySelector('.header-card');
      if (headerCard) {
        clearInterval(interval);
        resolve(headerCard);
      }
    }, 50);
  });

  const headerCard = await waitForHeaderCard();
  if (!headerCard) {
    console.error("Header-Card nicht gefunden!");
    return;
  }

  // #anchor erstellen und vor der header-card platzieren
  let anchor = document.getElementById('anchor');
  if (!anchor) {
    anchor = document.createElement('div');
    anchor.id = 'anchor';
    headerCard.parentNode.insertBefore(anchor, headerCard);
  }

  // Navigation und Scrollverhalten einrichten
  setupNavigation(root, hass, panel); // Lokale Parameter übergeben
  setupSwipeOnHeaderCard(root, hass, panel); // Lokale Parameter übergeben
  setupHeaderScrollBehavior(root);
}

function setupHeaderScrollBehavior(root) {
  const headerCard = root.querySelector('.header-card');
  const scrollBorder = root;
  const anchor = root.querySelector('#anchor');

  if (!headerCard || !scrollBorder || !anchor) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard, scrollBorder oder anchor.");
    return;
  }

  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) {
        headerCard.classList.add('sticky');
      } else {
        headerCard.classList.remove('sticky');
      }
    },
    {
      root: null,
      rootMargin: `0px 0px 0px 0px`,
      threshold: 0
    }
  );

  observer.observe(anchor);
}

function setupSwipeOnHeaderCard(root, hass, panel) {
  const headerCard = root.querySelector('.header-card');
  if (!headerCard) {
    console.error("Header-Card nicht gefunden!");
    return;
  }

  addSwipeEvents(
    headerCard,
    () => {
      if (currentPage < tabs.length - 1) {
        currentPage++;
        renderTab(root, hass, panel); // Lokale Parameter verwenden
        updateNavigationState(headerCard); // Zustand der Navigationspfeile aktualisieren
      }
    },
    () => {
      if (currentPage > 0) {
        currentPage--;
        renderTab(root, hass, panel); // Lokale Parameter verwenden
        updateNavigationState(headerCard); // Zustand der Navigationspfeile aktualisieren
      }
    }
  );
}

function setupNavigation(root, hass, panel) {
  const headerCard = root.querySelector('.header-card');
  if (!headerCard) {
    console.error("Header-Card nicht gefunden!");
    return;
  }

  const navLeft = headerCard.querySelector('#nav-left');
  const navRight = headerCard.querySelector('#nav-right');

  if (!navLeft || !navRight) {
    console.error("Navigationspfeile nicht gefunden!");
    return;
  }

  navLeft.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      renderTab(root, hass, panel); // Lokale Parameter verwenden
      updateNavigationState(headerCard); // Zustand der Navigationspfeile aktualisieren
    }
  });

  navRight.addEventListener('click', () => {
    if (currentPage < tabs.length - 1) {
      currentPage++;
      renderTab(root, hass, panel); // Lokale Parameter verwenden
      updateNavigationState(headerCard); // Zustand der Navigationspfeile aktualisieren
    }
  });

  updateNavigationState(headerCard); // Initialer Zustand der Navigationspfeile
}

function updateNavigationState(headerCard) {
  const navLeft = headerCard.querySelector('#nav-left');
  const navRight = headerCard.querySelector('#nav-right');

  if (navLeft) {
    if (currentPage === 0) {
      navLeft.disabled = true;
      navLeft.classList.add('disabled');
    } else {
      navLeft.disabled = false;
      navLeft.classList.remove('disabled');
    }
  }

  if (navRight) {
    if (currentPage === tabs.length - 1) {
      navRight.disabled = true;
      navRight.classList.add('disabled');
    } else {
      navRight.disabled = false;
      navRight.classList.remove('disabled');
    }
  }
}

class PPReaderDashboard extends HTMLElement {
  constructor() {
    super();
    this._root = document.createElement('div');
    this._root.className = 'pp-reader-dashboard';
    this.appendChild(this._root);

    this._lastPanel = null;
    this._lastNarrow = null;
    this._lastRoute = null;
    this._lastPage = null;
    this._scrollPositions = {}; // Speichert die Scroll-Position pro Tab

    this._updateListeners = null; // WebSocket-Listener für Updates
    this._initialized = false; // Initialisierungs-Flag
    this._hasNewData = false; // Flag für neue Daten
  }

  set hass(hass) {
    this._hass = hass;
    this._checkInitialization(); // Überprüfe die Initialisierung
  }

  set panel(panel) {
    this._panel = panel;
    this._checkInitialization(); // Überprüfe die Initialisierung
  }

  set narrow(narrow) {
    this._narrow = narrow;
    this._renderIfInitialized(); // Rendere nur, wenn initialisiert
  }

  set route(route) {
    this._route = route;
    this._renderIfInitialized(); // Rendere nur, wenn initialisiert
  }

  connectedCallback() {
    this._checkInitialization(); // Überprüfe die Initialisierung
  }

  disconnectedCallback() {
    this._removeUpdateListeners(); // Listener entfernen
    super.disconnectedCallback && super.disconnectedCallback();
  }

  _checkInitialization() {
    if (this._hass && this._panel && !this._initialized) {
      this._initialized = true;

      const entryId = this._panel?.config?._panel_custom?.config?.entry_id;
      if (!entryId) {
        console.warn("PPReaderDashboard: Keine entry_id verfügbar, überspringe Update-Subscription.");
        return;
      }

      // Initialisiere alle Update-Listener
      this._initializeUpdateListeners(entryId);

      this._render(); // Starte das erste Rendern
    }
  }

  _initializeUpdateListeners(entryId) {
    if (this._updateListeners) {
      console.warn("PPReaderDashboard: Listener bereits registriert, entferne alte Listener.");
      this._removeUpdateListeners();
    }

    try {
      this._updateListeners = initializeUpdateListeners(this._hass, entryId, {
        handleAccountUpdate: (update) => handleAccountUpdate(update, this._root),
        handleLastFileUpdate: (update) => handleLastFileUpdate(update, this._root),
      });
      console.debug("PPReaderDashboard: Update-Listener erfolgreich registriert.");
    } catch (error) {
      console.error("PPReaderDashboard: Fehler bei der Registrierung der Update-Listener:", error);
    }
  }

  _removeUpdateListeners() {
    if (this._updateListeners) {
      try {
        removeUpdateListeners(this._updateListeners);
        this._updateListeners = null;
        console.debug("PPReaderDashboard: Update-Listener erfolgreich entfernt.");
      } catch (error) {
        console.error("PPReaderDashboard: Fehler beim Entfernen der Update-Listener:", error);
      }
    }
  }

  _renderIfInitialized() {
    // Rendere nur, wenn die Initialisierung abgeschlossen ist
    if (this._initialized) {
      this._render();
    }
  }

  _render() {
    if (!this._hass) {
      console.warn("pp-reader-dashboard: noch kein hass, überspringe _render()");
      return;
    }

    // Prüfen, ob ein Render notwendig ist
    const page = currentPage;
    if (
      !this._hasNewData && // Nur rendern, wenn neue Daten vorliegen
      this._panel === this._lastPanel &&
      this._narrow === this._lastNarrow &&
      this._route === this._lastRoute &&
      this._lastPage === page
    ) {
      console.log("pp-reader-dashboard: keine Änderungen → skip render");
      return;
    }

    // Alte Scroll-Position merken (pro Tab)
    if (this._lastPage != null) {
      this._scrollPositions[this._lastPage] = this._root.scrollTop;
    }

    // Tatsächliches Rendern
    renderTab(this._root, this._hass, this._panel);

    // Scroll-Position wiederherstellen
    const restore = this._scrollPositions[page] || 0;
    this._root.scrollTop = restore;

    // Neuen „Last“-Zustand merken
    this._lastPanel = this._panel;
    this._lastNarrow = this._narrow;
    this._lastRoute = this._route;
    this._lastPage = page;

    // Setze das Flag für neue Daten zurück
    this._hasNewData = false;
  }
}

customElements.define('pp-reader-dashboard', PPReaderDashboard);