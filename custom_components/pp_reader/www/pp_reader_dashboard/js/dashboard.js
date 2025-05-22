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
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  set panel(panel) {
    this._panel = panel;
    this._render();
  }

  set narrow(narrow) {
    this._narrow = narrow;
    this._render();
  }

  set route(route) {
    this._route = route;
    this._render();
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    if (!this._hass) {
      console.warn("pp-reader-dashboard: noch kein hass, überspringe _render()");
      return;
    }
    renderTab(this._root, this._hass, this._panel);
  }
}

customElements.define('pp-reader-dashboard', PPReaderDashboard);