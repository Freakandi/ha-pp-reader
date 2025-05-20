import { addSwipeEvents } from './interaction/tab_control.js';
import { createThemeToggle } from './interaction/themeToggle.js';
import { renderDashboard } from './tabs/overview.js';
import { renderTestTab } from './tabs/test_tab.js';

const tabs = [
  { title: 'Dashboard', render: renderDashboard },
  { title: 'Test Tab', render: renderTestTab }
];

let currentPage = 0;
let observer; // Globale Variable für Debugging

async function renderTab(dashboardElem) {
  const tab = tabs[currentPage];
  let content = await tab.render();

  if (!dashboardElem) {
    console.error("Dashboard-Element nicht gefunden!");
    return;
  }

  dashboardElem.innerHTML = content;

  // Warte, bis die `.header-card` im DOM verfügbar ist
  const waitForHeaderCard = () => new Promise((resolve) => {
    const interval = setInterval(() => {
      const headerCard = dashboardElem.querySelector('.header-card');
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
  setupNavigation(dashboardElem);
  setupSwipeOnHeaderCard(dashboardElem);
  setupHeaderScrollBehavior(dashboardElem);
  createThemeToggle(dashboardElem); // Übergib dashboardElem als Container
}

function setupHeaderScrollBehavior(dashboardElem) {
  const headerCard = dashboardElem.querySelector('.header-card');
  const scrollBorder = dashboardElem;
  const anchor = dashboardElem.querySelector('#anchor');

  if (!headerCard || !scrollBorder || !anchor) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard, scrollBorder oder anchor.");
    return;
  }

  observer = new IntersectionObserver(
    ([entry]) => {
      let placeholder = dashboardElem.querySelector('.header-placeholder');
      if (!entry.isIntersecting) {
        // Platzhalter einfügen, falls nicht vorhanden
        /*if (!placeholder) {
          placeholder = document.createElement('div');
          placeholder.className = 'header-placeholder';
          placeholder.style.height = `${headerCard.offsetHeight}px`;
          headerCard.parentNode.insertBefore(placeholder, headerCard);
        }*/
        headerCard.classList.add('sticky');
      } else {
        headerCard.classList.remove('sticky');
        // Platzhalter entfernen
        /*if (placeholder) {
          placeholder.parentNode.removeChild(placeholder);
        }*/
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

function setupSwipeOnHeaderCard(dashboardElem) {
  const headerCard = dashboardElem.querySelector('.header-card');
  if (!headerCard) {
    console.error("Header-Card nicht gefunden!");
    return;
  }

  // Swipe-Events hinzufügen
  addSwipeEvents(
    headerCard,
    () => {
      if (currentPage < tabs.length - 1) {
        currentPage++;
        renderTab(dashboardElem);
      }
    },
    () => {
      if (currentPage > 0) {
        currentPage--;
        renderTab(dashboardElem);
      }
    }
  );
}

function setupNavigation(dashboardElem) {
  const headerCard = dashboardElem.querySelector('.header-card');
  if (!headerCard) {
    console.error("Header-Card nicht gefunden!");
    return;
  }

  // Navigationselemente finden
  const navLeft = headerCard.querySelector('#nav-left');
  const navRight = headerCard.querySelector('#nav-right');

  if (!navLeft || !navRight) {
    console.error("Navigationspfeile nicht gefunden!");
    return;
  }

  // Event-Listener für Navigationselemente hinzufügen
  navLeft.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      renderTab(dashboardElem);
    }
  });

  navRight.addEventListener('click', () => {
    if (currentPage < tabs.length - 1) {
      currentPage++;
      renderTab(dashboardElem);
    }
  });

  // Navigationselemente aktualisieren
  updateNavigationState();
}

function updateNavigationState() {
  const navLeft = document.querySelector('#nav-left');
  const navRight = document.querySelector('#nav-right');

  if (navLeft) {
    navLeft.disabled = currentPage === 0; // Deaktivieren, wenn auf dem ersten Tab
  }
  if (navRight) {
    navRight.disabled = currentPage === tabs.length - 1; // Deaktivieren, wenn auf dem letzten Tab
  }
}

customElements.define('pp-reader-dashboard', class extends HTMLElement {
  connectedCallback() {
    const root = document.createElement('div');
    root.className = 'pp-reader-dashboard';
    this.appendChild(root);

    renderTab(root); // Ersten Tab rendern und root übergeben
  }
});