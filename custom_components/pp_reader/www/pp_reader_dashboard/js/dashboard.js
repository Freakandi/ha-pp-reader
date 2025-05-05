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
  
  // Einfaches Sticky-Verhalten ohne setAttribute
  headerCard.style.position = 'sticky';
  headerCard.style.top = '0';
  headerCard.style.zIndex = '100';
  headerCard.style.boxSizing = 'border-box';
  headerCard.style.backgroundColor = 'var(--card-background-color, white)';
  headerCard.style.padding = '16px';
  
  // Header-Card leeren
  headerCard.innerHTML = '';

  // Inline-HTML für Navigation mit reinem HTML und inline-Styles
  headerCard.innerHTML = `
    <div style="display: flex; width: 100%; align-items: center; justify-content: space-between;">
      <button id="nav-left" style="width: 36px; height: 36px; border-radius: 50%; background-color: ${currentPage <= 0 ? 'rgba(204, 204, 204, 0.9)' : 'rgba(85, 85, 85, 0.9)'}; border: none; display: flex; align-items: center; justify-content: center;"${currentPage <= 0 ? ' disabled="disabled"' : ''}>
        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      </button>
      <h1 id="headerTitle" style="margin: 0; text-align: center; flex-grow: 1; font-size: 1.5rem;">${originalTitle}</h1>
      <button id="nav-right" style="width: 36px; height: 36px; border-radius: 50%; background-color: ${currentPage >= tabs.length - 1 ? 'rgba(204, 204, 204, 0.9)' : 'rgba(85, 85, 85, 0.9)'}; border: none; display: flex; align-items: center; justify-content: center;"${currentPage >= tabs.length - 1 ? ' disabled="disabled"' : ''}>
        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>
    </div>
  `;
  
  // Meta-Container erstellen - EINFACH gehalten
  const metaContainer = document.createElement('div');
  metaContainer.id = 'metaContainer';
  
  if (metaDiv) {
    metaContainer.appendChild(metaDiv);
    headerCard.appendChild(metaContainer);
  }

  // Event-Listener
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
  
  // DIREKTER Scroll-Handler - ALLES in einer Funktion
  window.addEventListener('scroll', () => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop || 0;
    const headerTitle = document.getElementById('headerTitle');
    
    // Debug
    console.log("Scroll-Event:", scrollTop);
    
    // Mindestens 20px scrollen, bevor die Änderung aktiviert wird
    if (scrollTop > 20) {
      // Die wichtigsten Styles direkt anwenden
      headerCard.style.padding = '8px 16px';
      headerCard.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      
      if (headerTitle) {
        headerTitle.style.fontSize = '1.2rem';
      }
      
      if (metaContainer) {
        metaContainer.style.display = 'none';
      }
    } else {
      // Normale Größe
      headerCard.style.padding = '16px';
      headerCard.style.boxShadow = 'none';
      
      if (headerTitle) {
        headerTitle.style.fontSize = '1.5rem';
      }
      
      if (metaContainer) {
        metaContainer.style.display = 'block';
      }
    }
  });
  
  // Initialer Scroll-Check ausführen
  setTimeout(() => {
    const scrollEvent = new Event('scroll');
    window.dispatchEvent(scrollEvent);
  }, 100);
  
  // Dot-Navigation
  const dotNav = document.createElement('div');
  dotNav.className = 'dot-navigation';
  dotNav.innerHTML = tabs.map((tab, index) => `
    <span class="nav-dot ${index === currentPage ? 'active' : ''}" data-index="${index}"></span>
  `).join('');
  
  headerCard.parentNode.insertBefore(dotNav, headerCard.nextSibling);
  
  // Event-Listener für Dots
  dotNav.querySelectorAll('.nav-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const index = parseInt(dot.getAttribute('data-index'), 10);
      if (index !== currentPage) {
        currentPage = index;
        renderTab();
      }
    });
  });
  
  // ----- SWIPE-FUNKTIONALITÄT -----
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