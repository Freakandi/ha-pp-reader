import { addSwipeEvents, goToTab } from './interaction/tab_control.js';
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
  
  const root = document.querySelector("pp-reader-dashboard");
  root.innerHTML = content;

  // Erst aufrufen, wenn DOM vollständig geladen ist
  setTimeout(() => {
    setupNavigation();
  }, 0);
}

function setupNavigation() {
  const headerCard = document.querySelector('.header-card');
  if (!headerCard) {
    console.error("Header-Card nicht gefunden!");
    return;
  }

  // Originalinhalt speichern und Meta-Informationen ermitteln
  const originalTitle = headerCard.querySelector('h1')?.textContent || tabs[currentPage].title;
  const metaDiv = headerCard.querySelector('.meta');
  
  // Header-Card leeren
  headerCard.innerHTML = '';

  // Korrekte Header-Navigation entsprechend den CSS-Regeln in styles.css erstellen
  // WICHTIG: Der Header-Nav-Container muss exakt dem in styles.css definierten Grid entsprechen
  headerCard.innerHTML = `
    <div class="header-nav">
      <button id="nav-left" class="nav-arrow left${currentPage <= 0 ? ' disabled' : ''}">
        <svg viewBox="0 0 24 24">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      </button>
      <h1 id="headerTitle">${originalTitle}</h1>
      <button id="nav-right" class="nav-arrow right${currentPage >= tabs.length - 1 ? ' disabled' : ''}">
        <svg viewBox="0 0 24 24">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>
    </div>
  `;
  
  // Meta-Div direkt hinzufügen, wenn vorhanden
  if (metaDiv) {
    const metaContainer = document.createElement('div');
    metaContainer.className = 'meta';
    metaContainer.appendChild(metaDiv.cloneNode(true));
    headerCard.appendChild(metaContainer);
  }

  // Event-Listener mit { passive: true } hinzufügen (behebt die Violation)
  document.getElementById('nav-left')?.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      renderTab();
    }
  }, { passive: true });

  document.getElementById('nav-right')?.addEventListener('click', () => {
    if (currentPage < tabs.length - 1) {
      currentPage++;
      renderTab();
    }
  }, { passive: true });
  
  // Scroll-Verhalten hinzufügen
  setupScrollBehavior();
  
  // SWIPE-FUNKTIONALITÄT - Event als passiv markieren
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

// Angepasste Funktion für das Scroll-Verhalten
function setupScrollBehavior() {
  const headerCard = document.querySelector('.header-card');
  const headerTitle = document.getElementById('headerTitle');
  if (!headerCard || !headerTitle) return;
  
  // Initialgröße merken
  const initialTitleSize = parseFloat(getComputedStyle(headerTitle).fontSize || '24');
  
  let ticking = false;

  const onScroll = () => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop || 0;
    
    // Debug zur Fehlersuche
    console.log(`Scroll: ${scrollTop}, Header: ${headerCard.classList.contains('sticky')}`);
    
    if (scrollTop > 20) {
      // Nur Klasse hinzufügen, wenn sie noch nicht vorhanden ist
      if (!headerCard.classList.contains('sticky')) {
        headerCard.classList.add('sticky');
        console.log("Header verkleinert", headerCard.classList);
      }
      headerTitle.style.fontSize = `${initialTitleSize * 0.85}px`;
    } else {
      // Nur Klasse entfernen, wenn sie vorhanden ist
      if (headerCard.classList.contains('sticky')) {
        headerCard.classList.remove('sticky');
        console.log("Header normal", headerCard.classList);
      }
      headerTitle.style.fontSize = `${initialTitleSize}px`;
    }
    
    ticking = false;
  };

  // Event-Listener für scroll-Ereignis mit { passive: true } (behebt die Violation)
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  
  // Auch auf dem document registrieren für iFrame-Umgebungen
  document.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  
  // Initialer Check
  setTimeout(onScroll, 100);
}

// iFrame-kompatible Scrollbehandlung
function setupIframeCompatibility() {
  // Dashboard-Container mit Inline-Styles versehen
  const dashboardElement = document.querySelector('pp-reader-dashboard');
  if (dashboardElement) {
    dashboardElement.style.position = 'relative';
    dashboardElement.style.display = 'block';
    dashboardElement.style.maxHeight = '100vh';
    dashboardElement.style.overflowY = 'auto';
    dashboardElement.style.overflowX = 'hidden';
  }
  
  // Body- und HTML-Styles für bessere iFrame-Integration
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.overflowX = 'hidden';
  document.documentElement.style.overflowX = 'hidden';
}

createThemeToggle();

customElements.define('pp-reader-dashboard', class extends HTMLElement {
  connectedCallback() {
    renderTab();
  }
});

// Nach der Definition aufrufen
setupIframeCompatibility();