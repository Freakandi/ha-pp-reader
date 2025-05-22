import { addSwipeEvents } from './interaction/tab_control.js';
import { renderDashboard } from './tabs/overview.js';
import { renderTestTab } from './tabs/test_tab.js';

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

    this._updateListener = null; // WebSocket-Listener für Updates
  }

  set hass(hass) {
    this._hass = hass;
    this._subscribeToUpdates(); // Abonniere Updates, wenn hass gesetzt wird
    this._render();
  }

  set panel(panel) {
    this._panel = panel;
    this._render();
  }

  set narrow(n) {
    this._narrow = n;
    this._render();
  }

  set route(r) {
    this._route = r;
    this._render();
  }

  connectedCallback() {
    this._render();
  }

  disconnectedCallback() {
    // Entferne den Listener, wenn das Dashboard entfernt wird
    if (this._updateListener) {
      this._hass.connection.unsubscribeEvents(this._updateListener);
      this._updateListener = null;
    }
  }

  _subscribeToUpdates() {
    if (!this._hass || this._updateListener) {
      return; // Bereits abonniert oder kein hass verfügbar
    }

    const entryId = this._panel?.config?._panel_custom?.config?.entry_id;
    if (!entryId) {
      console.warn("PPReaderDashboard: Keine entry_id verfügbar, überspringe Update-Subscription.");
      return;
    }

    // Abonniere das WebSocket-Event
    this._updateListener = this._hass.connection.subscribeEvents(
      (event) => this._handleUpdate(event),
      `pp_reader/dashboard_data_updated`
    );

    console.log("PPReaderDashboard: Update-Subscription erfolgreich eingerichtet.");
  }

  _handleUpdate(event) {
    console.log("PPReaderDashboard: Update erhalten:", event);

    // Aktualisiere die Daten oder rendere das Dashboard neu
    const updatedData = event.data;
    if (updatedData) {
      // Beispiel: Aktualisiere nur die geänderten Inhalte
      this._updateContent(updatedData);
    } else {
      // Alternativ: Komplettes Neurendern
      this._render();
    }
  }

  _updateContent(updatedData) {
    // Hier kannst du gezielt die Inhalte aktualisieren, die sich geändert haben
    console.log("PPReaderDashboard: Aktualisiere Inhalte mit neuen Daten:", updatedData);

    // Beispiel: Aktualisiere nur den aktuellen Tab
    renderTab(this._root, this._hass, this._panel);
  }

  _render() {
    if (!this._hass) {
      console.warn("pp-reader-dashboard: noch kein hass, überspringe _render()");
      return;
    }

    // Prüfen, ob ein Render notwendig ist
    const page = currentPage;
    if (
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
  }
}

customElements.define('pp-reader-dashboard', PPReaderDashboard);