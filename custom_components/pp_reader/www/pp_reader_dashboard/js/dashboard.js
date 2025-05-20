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

  createThemeToggle(dashboardElem); // Übergib dashboardElem als Container

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
}

function setupHeaderScrollBehavior(dashboardElem) {
  const headerCard = dashboardElem.querySelector('.header-card');
  const scrollBorder = dashboardElem;
  const anchor = dashboardElem.querySelector('#anchor');
  const headerTitle = dashboardElem.querySelector('#headerTitle');

  if (!headerCard || !scrollBorder || !anchor || !headerTitle) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard, scrollBorder, anchor oder headerTitle.");
    return;
  }

  observer = new IntersectionObserver(
    ([entry]) => {
      const headerCard = dashboardElem.querySelector('.header-card');
      let placeholder = dashboardElem.querySelector('.header-placeholder');
      if (!entry.isIntersecting) {
        headerCard.classList.add('sticky');
        headerTitle.style.fontSize = '1.0rem';
        // Platzhalter einfügen, falls nicht vorhanden
        if (!placeholder) {
          placeholder = document.createElement('div');
          placeholder.className = 'header-placeholder';
          placeholder.style.height = `${headerCard.offsetHeight}px`;
          headerCard.parentNode.insertBefore(placeholder, headerCard);
        }
      } else {
        headerCard.classList.remove('sticky');
        headerTitle.style.fontSize = '1.5rem';
        // Platzhalter entfernen
        if (placeholder) {
          placeholder.parentNode.removeChild(placeholder);
        }
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
  if (!headerCard) return;

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

  // Originalinhalt der Header-Card speichern
  const originalTitle = headerCard.querySelector('h1')?.textContent || tabs[currentPage].title;
  const metaDiv = headerCard.querySelector('.meta');

  // Header-Card leeren
  headerCard.innerHTML = '';

  // Navigationselemente und Titel einfügen
  headerCard.innerHTML = `
    <div style="display: flex; margin-right: 1rem; align-items: center; justify-content: space-between;">
      <button id="nav-left" style="width: 36px; height: 36px; border-radius: 50%; background-color: ${currentPage <= 0 ? 'rgba(204, 204, 204, 0.9)' : 'rgba(85, 85, 85, 0.9)'}; border: none; display: flex; align-items: center; justify-content: center;"${currentPage <= 0 ? ' disabled="disabled"' : ''}>
        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      </button>
      <h1 id="headerTitle" style="margin: 0; text-align: center; flex-grow: 1; font-size: 1.5rem; transition: font-size 0.3s ease;">${originalTitle}</h1>
      <button id="nav-right" style="width: 36px; height: 36px; border-radius: 50%; background-color: ${currentPage >= tabs.length - 1 ? 'rgba(204, 204, 204, 0.9)' : 'rgba(85, 85, 85, 0.9)'}; border: none; display: flex; align-items: center; justify-content: center;"${currentPage >= tabs.length - 1 ? ' disabled="disabled"' : ''}>
        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>
    </div>
  `;

  // Meta-Div wieder hinzufügen, falls vorhanden
  if (metaDiv) {
    headerCard.appendChild(metaDiv);
  }

  // Event-Listener für Navigationselemente hinzufügen
  dashboardElem.querySelector('#nav-left')?.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      renderTab(dashboardElem);
    }
  });

  dashboardElem.querySelector('#nav-right')?.addEventListener('click', () => {
    if (currentPage < tabs.length - 1) {
      currentPage++;
      renderTab(dashboardElem);
    }
  });
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