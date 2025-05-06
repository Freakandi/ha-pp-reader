import { addSwipeEvents } from './interaction/tab_control.js';
import { createThemeToggle } from './interaction/themeToggle.js';
import { renderDashboard, getHeaderContent as getDashboardHeaderContent } from './tabs/overview.js';
import { renderTestTab, getHeaderContent as getTestTabHeaderContent } from './tabs/test_tab.js';

const tabs = [
  { title: 'Dashboard', render: renderDashboard },
  { title: 'Test Tab', render: renderTestTab }
];

let currentPage = 0;

async function renderTab() {
  const tab = tabs[currentPage];

  // Tab-Inhalt rendern
  let content = await tab.render();

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

  createThemeToggle()

  // Navigation aktivieren
  setupNavigation();
}

function setupNavigation() {
  const root = document.querySelector("pp-reader-dashboard");
  if (!root) {
    console.error("pp-reader-dashboard nicht gefunden!");
    return;
  }

  // Navigationspfeile erstellen
  const navContainer = document.createElement('div');
  navContainer.className = 'navigation-container';
  navContainer.innerHTML = `
    <button id="nav-left" class="nav-button">&lt;</button>
    <button id="nav-right" class="nav-button">&gt;</button>
  `;

  // Event-Listener für Navigation
  navContainer.querySelector('#nav-left').addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      renderTab();
    }
  });

  navContainer.querySelector('#nav-right').addEventListener('click', () => {
    if (currentPage < tabs.length - 1) {
      currentPage++;
      renderTab();
    }
  });

  // Swipe-Funktionalität hinzufügen
  addSwipeEvents(root, () => {
    if (currentPage < tabs.length - 1) {
      currentPage++;
      renderTab();
    }
  }, () => {
    if (currentPage > 0) {
      currentPage--;
      renderTab();
    }
  });

  // Navigationspfeile in den DOM einfügen
  root.prepend(navContainer);
}

customElements.define('pp-reader-dashboard', class extends HTMLElement {
  connectedCallback() {
    renderTab(); // Ersten Tab rendern
  }
});