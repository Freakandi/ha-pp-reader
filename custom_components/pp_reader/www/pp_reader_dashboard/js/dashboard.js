import { addSwipeEvents } from './interaction/tab_control.js';
import { createThemeToggle } from './interaction/themeToggle.js';
import { renderDashboard } from './tabs/overview.js';
import { renderTestTab } from './tabs/test_tab.js';

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

  createThemeToggle();

  // Scrollverhalten der Header Card einrichten
  setupHeaderScrollBehavior();

  // Swipe-Funktionalität auf der Header-Card einrichten
  setupSwipeOnHeaderCard();

  // Navigation aktualisieren
  updateNavigationState();
}

function setupHeaderScrollBehavior() {
  const headerCard = document.querySelector('.header-card');
  if (!headerCard) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) {
        // Sticky-Eigenschaft aktivieren
        headerCard.classList.add('sticky');
      } else {
        // Sticky-Eigenschaft deaktivieren
        headerCard.classList.remove('sticky');
      }
    },
    {
      rootMargin: `56px 0px 0px 0px`, // Beobachtungsbereich nach unten verschieben
      threshold: 0 // Sticky wird ausgelöst, sobald die Oberkante den verschobenen Bereich erreicht
    }
  );

  observer.observe(headerCard);
}

function setupSwipeOnHeaderCard() {
  const headerCard = document.querySelector('.header-card');
  if (!headerCard) return;

  addSwipeEvents(
    headerCard,
    () => {
      if (currentPage < tabs.length - 1) {
        currentPage++;
        renderTab();
      }
    },
    () => {
      if (currentPage > 0) {
        currentPage--;
        renderTab();
      }
    }
  );
}

function setupNavigation() {
  const root = document.querySelector("pp-reader-dashboard");
  if (!root) {
    console.error("pp-reader-dashboard nicht gefunden!");
    return;
  }

  // Navigationspfeile erstellen, falls noch nicht vorhanden
  let navContainer = root.querySelector('.navigation-container');
  if (!navContainer) {
    navContainer = document.createElement('div');
    navContainer.className = 'navigation-container';
    navContainer.innerHTML = `
      <button id="nav-left" class="nav-button">&lt;</button>
      <button id="nav-right" class="nav-button">&gt;</button>
    `;
    root.prepend(navContainer);

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
  }
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
    root.className = 'tab-content';
    this.appendChild(root);

    setupNavigation(); // Navigation einmalig erstellen
    renderTab(); // Ersten Tab rendern
  }
});