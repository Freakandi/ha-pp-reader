import { addSwipeEvents } from './interaction/tab_control.js';
import { renderDashboard, attachPortfolioToggleHandler } from './tabs/overview.js';
import { renderTestTab } from './tabs/test_tab.js';
import {
  handleAccountUpdate,
  handleLastFileUpdate,
  handlePortfolioUpdate,
  handlePortfolioPositionsUpdate
} from './data/updateConfigsWS.js';
import { getEntryId } from './data/api.js';

const tabs = [
  { title: 'Dashboard', render: renderDashboard },
  { title: 'Test Tab', render: renderTestTab }
];

let currentPage = 0;
let observer; // Globale Variable für Debugging

async function renderTab(root, hass, panel) {
  // Fallback: Panel-Konfiguration aus hass.panels ableiten, falls panel undefined
  let effectivePanel = panel;
  if (!effectivePanel && hass?.panels) {
    // Versuche spezifische Keys
    effectivePanel =
      hass.panels.ppreader ||
      hass.panels.pp_reader ||
      // Suche nach unserem Webcomponent
      Object.values(hass.panels).find(p => p?.webcomponent_name === 'pp-reader-panel') ||
      null;
  }

  const tab = tabs[currentPage];
  if (!tab || !tab.render) {
    console.error("renderTab: Kein gültiger Tab oder keine render-Methode gefunden!");
    return;
  }

  let content;
  try {
    content = await tab.render(root, hass, effectivePanel); // effectivePanel statt panel
  } catch (error) {
    console.error("renderTab: Fehler beim Rendern des Tabs:", error);
    root.innerHTML = `<div class="card"><h2>Fehler</h2><pre>${(error && error.message) || error}</pre></div>`;
    return;
  }

  if (!root) {
    console.error("renderTab: Root-Element nicht gefunden!");
    return;
  }

  root.innerHTML = content;

  // NEU (Section 6): Scoped Listener für Portfolio-Expand nur für Overview-Tab (Index 0 / Titel 'Dashboard')
  if (tabs[currentPage]?.render === renderDashboard) {
    attachPortfolioToggleHandler(root);
  }

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

    this._unsubscribeEvents = null; // Event-Bus-Listener für Updates
    this._initialized = false; // Initialisierungs-Flag
    this._hasNewData = false; // Flag für neue Daten
  }

  set hass(hass) {
    this._hass = hass;
    this._checkInitialization(); // Überprüfe die Initialisierung
  }

  set panel(panel) {
    this._panel = panel;
    // Debug
    // console.debug("PPReaderDashboard: panel setter", panel);
    this._checkInitialization();
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
    this._checkInitialization();
  }

  disconnectedCallback() {
    // Wenn das Element aus dem DOM fliegt, sauber abmelden
    if (typeof this._unsubscribeEvents === "function") {
      this._unsubscribeEvents();
      // console.debug("PPReaderDashboard: Event-Listener entfernt");
      this._unsubscribeEvents = null;
    }
    super.disconnectedCallback && super.disconnectedCallback();
  }

  _checkInitialization() {
    if (!this._hass || this._initialized) return;

    // Panel-Fallback falls nicht gesetzt
    if (!this._panel && this._hass.panels) {
      this._panel =
        this._hass.panels.ppreader ||
        this._hass.panels.pp_reader ||
        Object.values(this._hass.panels).find(p => p?.config?._panel_custom?.module_url?.includes('pp_reader_dashboard')) ||
        null;
    }

    const entryId = getEntryId(this._hass, this._panel);
    if (entryId) {
      console.debug("PPReaderDashboard: entry_id (fallback) =", entryId);
    } else {
      console.warn("PPReaderDashboard: kein entry_id ermittelbar – versuche dennoch Initialisierung (API wirft dann klaren Fehler).");
    }
    this._initialized = true;
    this._initializeEventListeners(entryId || '');
    this._render();
  }

  _initializeEventListeners(entryId) {
    // Wenn schon mal registriert, vorher sauber abmelden
    if (this._unsubscribeEvents) {
      this._unsubscribeEvents();
      this._unsubscribeEvents = null;
    }

    const conn = this._hass?.connection;
    if (!conn || typeof conn.subscribeEvents !== "function") {
      console.error("PPReaderDashboard: keine valide WebSocket-Verbindung oder subscribeEvents fehlt");
      return;
    }

    // Korrektur: Richtiger Event-Typ ist 'panels_updated' (Wert von HA CONST EVENT_PANELS_UPDATED)
    // Zur Sicherheit auch Legacy-Fehlwert registrieren (wird einfach nie feuern)
    const eventTypes = ["panels_updated"]; // früher fälschlich: "EVENT_PANELS_UPDATED"

    const subs = [];
    Promise.all(
      eventTypes.map(et =>
        conn
          .subscribeEvents(this._handleBusEvent.bind(this), et)
          .then(unsub => {
            if (typeof unsub === "function") {
              subs.push(unsub);
              console.debug("PPReaderDashboard: subscribed to", et);
            } else {
              console.error("PPReaderDashboard: subscribeEvents lieferte kein Unsubscribe-Func für", et, unsub);
            }
          })
          .catch(err => {
            console.error("PPReaderDashboard: Fehler bei subscribeEvents für", et, err);
          })
      )
    ).then(() => {
      this._unsubscribeEvents = () => {
        subs.forEach(f => {
          try { f(); } catch (e) { /* noop */ }
        });
        console.debug("PPReaderDashboard: alle Event-Subscriptions entfernt");
      };
    });
  }

  _removeEventListeners() {
    if (typeof this._unsubscribeEvents === "function") {
      try {
        this._unsubscribeEvents();
        this._unsubscribeEvents = null;
        // console.debug("PPReaderDashboard: Event-Listener erfolgreich entfernt.");
      } catch (error) {
        console.error("PPReaderDashboard: Fehler beim Entfernen der Event-Listener:", error);
      }
    } else {
      console.warn("PPReaderDashboard: Kein gültiger Event-Listener zum Entfernen gefunden.");
    }
  }

  _handleBusEvent(event) {
    const currentEntryId = getEntryId(this._hass, this._panel);
    if (!currentEntryId || event.data.entry_id !== currentEntryId) return;

    console.debug("PPReaderDashboard: Bus-Update erhalten", event.data);

    // Daten direkt ins Rendern einfließen lassen
    this._doRender(event.data.data_type, event.data.data);
  }

  _doRender(dataType, pushedData) {
    if (dataType === "accounts") {
      handleAccountUpdate(pushedData, this._root);
    } else if (dataType === "last_file_update") {
      handleLastFileUpdate(pushedData, this._root);
    } else if (dataType === "portfolio_values") {
      handlePortfolioUpdate(pushedData, this._root);
    } else if (dataType === "portfolio_positions") {
      // NEU: Einzelpositions-Update für ein bestimmtes Depot
      handlePortfolioPositionsUpdate(pushedData, this._root);
    } else {
      console.warn("PPReaderDashboard: Unbekannter Datentyp:", dataType);
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
    if (!this._initialized) {
      console.debug("pp-reader-dashboard: _render aufgerufen bevor initialisiert");
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
      // console.log("pp-reader-dashboard: keine Änderungen → skip render");
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

console.log("PPReader dashboard.js v20250914b geladen");