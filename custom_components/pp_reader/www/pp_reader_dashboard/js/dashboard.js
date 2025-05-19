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

  createThemeToggle();

  // #anchor erstellen und vor der header-card platzieren
  const headerCard = dashboardElem.querySelector('.header-card');
  if (!headerCard) {
    console.error("Header-Card nicht gefunden!");
    return;
  }

  if (headerCard) {
    let anchor = document.getElementById('anchor');
    if (!anchor) {
      anchor = document.createElement('div');
      anchor.id = 'anchor';
      headerCard.parentNode.insertBefore(anchor, headerCard);
      console.log('Anchor wurde erstellt:', anchor); // Debugging-Ausgabe
    }
  }

  // Navigation in die Header-Card einfügen
  setupNavigation();

  // Swipe-Funktionalität auf der Header-Card einrichten
  setupSwipeOnHeaderCard();

  // Scrollverhalten der Header Card einrichten
  setupHeaderScrollBehavior(); // Jetzt aufrufen, nachdem der #anchor erstellt wurde
}

function setupHeaderScrollBehavior() {
  const headerCard = document.querySelector('.header-card');
  const scrollBorder = document.querySelector('pp-reader-dashboard');
  const anchor = document.getElementById('anchor');
  const headerTitle = document.getElementById('headerTitle'); // Das h1-Element

  // Überprüfen, ob alle erforderlichen Elemente vorhanden sind
  if (!headerCard || !scrollBorder || !anchor || !headerTitle) {
    console.error("Fehlende Elemente für das Scrollverhalten: headerCard, scrollBorder, anchor oder headerTitle.");
    return;
  }

  // IntersectionObserver einrichten
  observer = new IntersectionObserver(
    ([entry]) => {
      console.log('IntersectionObserver Entry:', entry); // Debugging-Ausgabe
      if (!entry.isIntersecting) {
        headerCard.classList.add('sticky'); // Sticky-Eigenschaft aktivieren
        headerTitle.style.fontSize = '1.0rem'; // Schriftgröße verkleinern
      } else {
        headerCard.classList.remove('sticky'); // Sticky-Eigenschaft deaktivieren
        headerTitle.style.fontSize = '1.5rem'; // Schriftgröße zurücksetzen
      }
    },
    {
      root: null, // Verwende den gesamten Viewport
      rootMargin: `0px 0px 0px 0px`,
      threshold: 0
    }
  );

  observer.observe(anchor); // Beobachtung des #anchor starten
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
  const headerCard = document.querySelector('.header-card');
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
    <div style="display: flex; width: 100%; margin-right: 1rem; align-items: center; justify-content: space-between;">
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