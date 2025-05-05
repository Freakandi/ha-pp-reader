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
  
  // Inline-Styles für Sticky-Verhalten direkt hinzufügen - HIER WICHTIG!
  headerCard.style.position = 'sticky';
  headerCard.style.top = '0';
  headerCard.style.zIndex = '100';
  headerCard.style.transition = 'all 0.3s ease';
  headerCard.style.padding = '16px';  // Ausgangswert für Padding
  headerCard.style.boxSizing = 'border-box';
  headerCard.style.backgroundColor = 'var(--card-background-color, white)';
  
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
      <h1 id="headerTitle" style="margin: 0; text-align: center; flex-grow: 1; font-size: 1.5rem; transition: font-size 0.3s ease;">${originalTitle}</h1>
      <button id="nav-right" style="width: 36px; height: 36px; border-radius: 50%; background-color: ${currentPage >= tabs.length - 1 ? 'rgba(204, 204, 204, 0.9)' : 'rgba(85, 85, 85, 0.9)'}; border: none; display: flex; align-items: center; justify-content: center;"${currentPage >= tabs.length - 1 ? ' disabled="disabled"' : ''}>
        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>
    </div>
  `;
  
  // Meta-Container erstellen mit Inline-Styles für Animation
  const metaContainer = document.createElement('div');
  metaContainer.id = 'metaContainer';
  metaContainer.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
  metaContainer.style.maxHeight = '200px'; 
  metaContainer.style.overflow = 'hidden';
  metaContainer.style.opacity = '1';
  
  if (metaDiv) {
    metaContainer.appendChild(metaDiv);
    headerCard.appendChild(metaContainer);
  }

  // Event-Listener direkt hinzufügen
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
  
  // Direkter Scroll-Event-Listener, ohne separate Funktion
  let lastScrollTop = 0;
  window.addEventListener('scroll', () => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop || window.scrollY || 0;
    const headerTitle = document.getElementById('headerTitle');
    const metaContainer = document.getElementById('metaContainer');
    
    // Wenn wir nach unten scrollen und über 20px sind
    if (scrollTop > 20) {
      // Verkleinerte Ansicht
      headerCard.style.padding = '8px 16px'; // Reduziertes Padding
      headerCard.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      
      if (headerTitle) {
        headerTitle.style.fontSize = '1.2rem'; // Kleinerer Titel
      }
      
      if (metaContainer) {
        metaContainer.style.maxHeight = '0';
        metaContainer.style.opacity = '0';
      }
    } else {
      // Normale Ansicht
      headerCard.style.padding = '16px';
      headerCard.style.boxShadow = 'none';
      
      if (headerTitle) {
        headerTitle.style.fontSize = '1.5rem';
      }
      
      if (metaContainer) {
        metaContainer.style.maxHeight = '200px';
        metaContainer.style.opacity = '1';
      }
    }
    
    // Debugging-Ausgabe hinzufügen
    console.log("Scroll-Position:", scrollTop, "Header-Styles:", {
      position: headerCard.style.position,
      top: headerCard.style.top,
      padding: headerCard.style.padding,
      fontSize: headerTitle?.style.fontSize,
      metaHeight: metaContainer?.style.maxHeight,
      isSticky: window.getComputedStyle(headerCard).position === 'sticky',
      zIndex: headerCard.style.zIndex
    });
    
    lastScrollTop = scrollTop;
  });
  
  // ----- DOT-NAVIGATION -----
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

  // Debug-Information
  console.log("Navigation eingerichtet:", {
    headerCard: headerCard,
    navigationElements: headerCard.querySelectorAll('.nav-arrow'),
    title: headerCard.querySelector('h1'),
    position: headerCard.style.position,
    computedPosition: window.getComputedStyle(headerCard).position
  });
  
  // Versuch, durch erneutes Setzen der Eigenschaften den Sticky-Effekt zu erzwingen
  setTimeout(() => {
    headerCard.style.position = '';
    setTimeout(() => {
      headerCard.style.position = 'sticky';
      console.log("Position neu gesetzt:", headerCard.style.position);
    }, 10);
  }, 10);
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