import { addSwipeEvents } from './interaction/tab_control.js';
import { createThemeToggle } from './interaction/themeToggle.js';
import { renderDashboard, getHeaderContent as getDashboardHeaderContent } from './tabs/overview.js';
import { renderTestTab, getHeaderContent as getTestTabHeaderContent } from './tabs/test_tab.js';

const tabs = [
  { title: 'Dashboard', render: renderDashboard, getHeaderContent: getDashboardHeaderContent },
  { title: 'Test Tab', render: renderTestTab, getHeaderContent: getTestTabHeaderContent }
];

let currentPage = 0;

async function renderTab() {
  const tab = tabs[currentPage];

  // Tab-Inhalt rendern
  let content = await tab.render();

  // Header-Card aktualisieren
  const headerCard = document.querySelector('.header-card');
  if (!headerCard) {
    console.error("Header-Card nicht gefunden! Überprüfe, ob setupHeaderCard korrekt aufgerufen wurde.");
    return;
  }

  try {
    const { title, meta } = await tab.getHeaderContent(); // Asynchroner Aufruf
    headerCard.querySelector('h1').textContent = title;
    const metaDiv = headerCard.querySelector('.meta');
    metaDiv.innerHTML = meta || ''; // Meta-Inhalte aktualisieren
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Header-Card:', error);
  }

  // Tab-Inhalte einfügen
  const root = document.querySelector("pp-reader-dashboard");
  if (!root) {
    console.error("pp-reader-dashboard nicht gefunden!");
    return;
  }

  const tabContent = root.querySelector('.tab-content');
  if (!tabContent) {
    console.error("Tab-Content-Container nicht gefunden!");
    return;
  }

  tabContent.innerHTML = content;

  // Navigation und Sticky-Header aktivieren
  setTimeout(() => {
    setupNavigation();
    setupStickyHeader();
  }, 0);
}

function setupHeaderCard() {
  const root = document.querySelector("pp-reader-dashboard");
  if (!root) {
    console.error("pp-reader-dashboard nicht gefunden!");
    return;
  }

  const headerCard = document.createElement('div');
  headerCard.className = 'card header-card';
  headerCard.innerHTML = `
    <h1></h1>
    <div class="meta"></div>
  `;
  root.prepend(headerCard);
}

function setupNavigation() {
  const headerCard = document.querySelector('.header-card');
  if (!headerCard) {
    console.error("Header-Card nicht gefunden!");
    return;
  }

  // Navigation erstellen
  const originalTitle = headerCard.querySelector('h1')?.textContent || tabs[currentPage].title;

  headerCard.innerHTML = `
    <div style="display: flex; width: 100%; align-items: center; justify-content: space-between;">
      <button id="nav-left" style="width: 36px; height: 36px; border-radius: 50%; background-color: ${currentPage <= 0 ? 'rgba(204, 204, 204, 0.9)' : 'rgba(85, 85, 85, 0.9)'}; border: none; display: flex; align-items: center; justify-content: center;"${currentPage <= 0 ? ' disabled="disabled"' : ''}>
        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      </button>
      <h1 style="margin: 0; text-align: center; flex-grow: 1; font-size: 1.5rem;">${originalTitle}</h1>
      <button id="nav-right" style="width: 36px; height: 36px; border-radius: 50%; background-color: ${currentPage >= tabs.length - 1 ? 'rgba(204, 204, 204, 0.9)' : 'rgba(85, 85, 85, 0.9)'}; border: none; display: flex; align-items: center; justify-content: center;"${currentPage >= tabs.length - 1 ? ' disabled="disabled"' : ''}>
        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>
    </div>
  `;

  // Event-Listener für Navigation
  document.getElementById('nav-left')?.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      renderTab();
    }
  });

  document.getElementById('nav-right')?.addEventListener('click', () => {
    if (currentPage < tabs.length - 1) {
      currentPage++;
      renderTab();
    }
  });

  // Swipe-Funktionalität
  addSwipeEvents(
    headerCard,
    () => { // onSwipeLeft
      if (currentPage < tabs.length - 1) {
        currentPage++;
        renderTab();
      }
    },
    () => { // onSwipeRight
      if (currentPage > 0) {
        currentPage--;
        renderTab();
      }
    }
  );
}

function setupStickyHeader() {
  const headerCard = document.querySelector('.header-card');
  if (!headerCard) {
    console.error("Header-Card nicht gefunden!");
    return;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) {
        headerCard.classList.add('sticky');
      } else {
        headerCard.classList.remove('sticky');
      }
    },
    { root: null, threshold: 0 }
  );

  observer.observe(headerCard);
}

createThemeToggle();

customElements.define('pp-reader-dashboard', class extends HTMLElement {
  connectedCallback() {
    setupHeaderCard(); // Header-Card erstellen
    renderTab(); // Ersten Tab rendern
  }
});